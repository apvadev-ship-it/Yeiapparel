/**
 * Agente de IA que redacta las actualizaciones de marca del boletín.
 *
 * Modelo: Claude Opus 5, con pensamiento adaptativo. Escribe en la voz de
 * YEI y devuelve una estructura fija (asunto, preencabezado, titular,
 * párrafos y llamada a la acción) mediante salidas estructuradas, no
 * texto libre que luego habría que adivinar cómo trocear.
 *
 * Dos decisiones que sostienen todo lo demás:
 *
 * 1. ANCLAJE. Al modelo se le pasa el catálogo real —nombres, precios,
 *    descripciones— y se le prohíbe inventar cualquier dato que no esté
 *    ahí. Un boletín que anuncia una prenda inexistente o un precio
 *    equivocado es una promesa comercial que la tienda no puede cumplir.
 *
 * 2. VALIDACIÓN POSTERIOR. El envío de estas campañas es automático, así
 *    que nadie lee el texto antes de que salga. Por eso lo que devuelve
 *    el modelo se comprueba contra el catálogo ANTES de enviarse, y una
 *    campaña que no pase la comprobación se descarta en vez de enviarse.
 *    El modelo casi siempre acierta; "casi siempre" no es suficiente
 *    cuando el resultado llega a clientes reales y no se puede deshacer.
 *
 * SECURITY_RULES Regla 3: ANTHROPIC_API_KEY es secreta, solo servidor.
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { products, formatPrice } from "@/lib/products";
import { FREE_SHIPPING_FROM } from "@/lib/stock";
import { readEnv } from "@/lib/runtime-env";
import type { CampaignBody } from "@/lib/email-templates";

/** Modelo por defecto. Se puede fijar otro con ANTHROPIC_MODEL. */
const DEFAULT_MODEL = "claude-opus-5";

/**
 * Esquema de lo que debe devolver el modelo.
 *
 * Los topes de longitud no son decorativos: un asunto de 200 caracteres
 * se corta en la bandeja de entrada y un titular larguísimo rompe la
 * maqueta del correo. Se acotan aquí para que el modelo apunte al
 * tamaño correcto, y se vuelven a comprobar después.
 */
const campaignSchema = z.object({
  subject: z
    .string()
    .describe("Asunto del correo, máximo 60 caracteres, sin emojis"),
  preheader: z
    .string()
    .describe(
      "Texto que acompaña al asunto en la bandeja, máximo 90 caracteres",
    ),
  headline: z
    .string()
    .describe("Titular dentro del correo, máximo 70 caracteres"),
  paragraphs: z
    .array(z.string())
    .describe(
      "Entre 2 y 4 párrafos, de 40 a 320 caracteres cada uno, en la voz de la marca",
    ),
  ctaLabel: z
    .string()
    .describe(
      "Texto del botón, 2 a 4 palabras, por ejemplo 'Ver la colección'",
    ),
  ctaPath: z
    .string()
    .describe(
      "Ruta interna de la tienda a la que lleva el botón. Solo una de las rutas permitidas.",
    ),
});

/**
 * El mismo contrato, en JSON Schema, que es lo que viaja a la API.
 *
 * Va escrito a mano y no generado desde el esquema de zod porque el
 * ayudante `zodOutputFormat` del SDK requiere zod 4, y este proyecto usa
 * zod 3 para validar el checkout. Subir zod de versión para ahorrar
 * estas líneas habría tocado la validación de los pagos, que funciona.
 *
 * Si se cambia uno de los dos, hay que cambiar el otro. El de zod manda:
 * es el que decide si una campaña se envía o se descarta.
 */
const CAMPAIGN_JSON_SCHEMA = {
  type: "object",
  properties: {
    subject: {
      type: "string",
      description: "Asunto del correo, máximo 60 caracteres, sin emojis",
    },
    preheader: {
      type: "string",
      description:
        "Texto que acompaña al asunto en la bandeja, máximo 90 caracteres",
    },
    headline: {
      type: "string",
      description: "Titular dentro del correo, máximo 70 caracteres",
    },
    paragraphs: {
      type: "array",
      items: { type: "string" },
      minItems: 2,
      maxItems: 4,
      description:
        "Entre 2 y 4 párrafos, de 40 a 320 caracteres cada uno, en la voz de la marca",
    },
    ctaLabel: {
      type: "string",
      description:
        "Texto del botón, 2 a 4 palabras, por ejemplo 'Ver la colección'",
    },
    ctaPath: {
      type: "string",
      description:
        "Ruta interna de la tienda a la que lleva el botón. Solo una de las rutas del catálogo.",
    },
  },
  required: [
    "subject",
    "preheader",
    "headline",
    "paragraphs",
    "ctaLabel",
    "ctaPath",
  ],
  additionalProperties: false,
} as const;

/**
 * Rutas a las que puede apuntar el botón.
 *
 * Es una lista cerrada a propósito: si el modelo se inventara una URL,
 * el correo llevaría a los clientes a una página que no existe, o peor,
 * fuera del dominio. Se valida contra esta lista.
 */
const ALLOWED_PATHS = new Set([
  "/",
  "/tienda",
  "/nueva-coleccion",
  "/historia",
  "/contacto",
  ...products.map((p) => `/producto/${p.slug}`),
]);

export type BrandUpdate = {
  subject: string;
  preheader: string;
  body: CampaignBody;
  model: string;
};

export type BrandUpdateResult =
  { ok: true; update: BrandUpdate } | { ok: false; error: string };

/** `true` si hay credenciales para llamar al modelo. */
export function brandAgentConfigured(): boolean {
  return Boolean(readEnv("ANTHROPIC_API_KEY"));
}

/**
 * El catálogo, en texto, para anclar al modelo. Se construye desde el
 * mismo `products.ts` que usa la tienda, de modo que no puedan
 * desincronizarse.
 */
function catalogContext(): string {
  const lines = products.map(
    (p) =>
      `- ${p.name} (${p.category}) · ${formatPrice(p.price)} · ruta /producto/${p.slug}\n  ${p.description}`,
  );

  return [
    "CATÁLOGO ACTUAL (única fuente de verdad sobre prendas y precios):",
    ...lines,
    "",
    `Envío gratis a partir de ${formatPrice(FREE_SHIPPING_FROM)}.`,
    "La tienda vende únicamente en Colombia y cobra en pesos colombianos.",
  ].join("\n");
}

const SYSTEM_PROMPT = `Escribes los correos de marca de YEI Apparel, una marca colombiana de moda femenina.

VOZ DE LA MARCA
Elegancia contemporánea, feminidad sofisticada, minimalismo editorial. La referencia es una revista de moda, no un folleto de descuentos. Escribe en español de Colombia, en segunda persona ("tú"), con frases cortas y limpias.

REGLAS DURAS
- No inventes NADA. Prendas, precios, materiales, fechas, plazos de envío y disponibilidad salen exclusivamente del catálogo que te doy. Si un dato no está ahí, no lo menciones.
- No prometas descuentos, promociones, rebajas ni envíos gratis que no consten en el catálogo.
- No inventes fechas de lanzamiento ni eventos.
- Nada de emojis, signos de exclamación múltiples, ni mayúsculas sostenidas.
- Nada de urgencia falsa: "últimas horas", "solo hoy", "no te lo pierdas" están prohibidos salvo que el dato conste.
- El botón apunta a una ruta del catálogo o a una de las páginas de la tienda. Nunca a un dominio externo.

Prefiere hablar de las piezas y de cómo se usan antes que de vender. Si no hay novedad real que contar, escribe sobre una prenda concreta del catálogo.`;

/**
 * Redacta una actualización de marca.
 *
 * @param brief Tema en una frase. Si se omite, el agente elige una pieza
 *              del catálogo y escribe sobre ella.
 */
export async function generateBrandUpdate(
  brief?: string,
): Promise<BrandUpdateResult> {
  const apiKey = readEnv("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return { ok: false, error: "Falta ANTHROPIC_API_KEY." };
  }

  const model = readEnv("ANTHROPIC_MODEL") ?? DEFAULT_MODEL;
  const client = new Anthropic({ apiKey });

  const instruction = brief?.trim()
    ? `Escribe la actualización sobre esto: ${brief.trim()}`
    : "Escribe una actualización de marca eligiendo una pieza del catálogo y contando por qué merece la pena.";

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      // Pensamiento adaptativo: el modelo decide cuánto razonar. El
      // esfuerzo medio basta para un correo de marca y cuesta menos que
      // el alto, que está pensado para problemas más duros.
      thinking: { type: "adaptive" },
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: CAMPAIGN_JSON_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: `${catalogContext()}\n\n${instruction}`,
        },
      ],
    });

    // Una negativa del modelo llega con HTTP 200: hay que mirar
    // `stop_reason` antes que el contenido, o se lee un `content` vacío.
    if (response.stop_reason === "refusal") {
      const detail = response.stop_details?.explanation ?? "sin detalle";
      return { ok: false, error: `El modelo declinó la petición: ${detail}` };
    }

    // `content` es una unión: hay que quedarse con el bloque de texto.
    // Con pensamiento activado, el primer bloque puede ser `thinking`.
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { ok: false, error: "El modelo no devolvió texto." };
    }

    let raw: unknown;
    try {
      raw = JSON.parse(textBlock.text);
    } catch {
      return { ok: false, error: "El modelo no devolvió JSON válido." };
    }

    // El esquema de zod es el que manda: aunque la API ya restringe el
    // formato, aquí se vuelve a comprobar antes de tocar nada.
    const parsed = campaignSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: `La estructura devuelta no encaja: ${parsed.error.issues[0]?.message ?? "motivo desconocido"}`,
      };
    }

    return validateUpdate(parsed.data, model);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: "ANTHROPIC_API_KEY inválida." };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { ok: false, error: "Límite de peticiones de la API alcanzado." };
    }
    if (error instanceof Anthropic.APIError) {
      return { ok: false, error: `Error de la API (${error.status}).` };
    }
    const reason = error instanceof Error ? error.message : "error desconocido";
    return { ok: false, error: reason };
  }
}

/**
 * Comprueba el texto generado antes de que llegue a nadie.
 *
 * Con envío automático esta función es la última defensa: lo que pase de
 * aquí sale a los clientes sin que ninguna persona lo lea.
 */
function validateUpdate(
  parsed: z.infer<typeof campaignSchema>,
  model: string,
): BrandUpdateResult {
  const subject = parsed.subject.trim();
  const preheader = parsed.preheader.trim();
  const headline = parsed.headline.trim();
  const ctaLabel = parsed.ctaLabel.trim();
  const ctaPath = parsed.ctaPath.trim();
  const paragraphs = parsed.paragraphs
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (!subject || subject.length > 90) {
    return { ok: false, error: `Asunto fuera de rango (${subject.length}).` };
  }
  if (!headline || headline.length > 110) {
    return { ok: false, error: `Titular fuera de rango (${headline.length}).` };
  }
  if (paragraphs.length < 1 || paragraphs.length > 5) {
    return {
      ok: false,
      error: `Número de párrafos inesperado (${paragraphs.length}).`,
    };
  }
  if (!ctaLabel || ctaLabel.length > 40) {
    return { ok: false, error: "Texto del botón fuera de rango." };
  }

  // La ruta tiene que estar en la lista cerrada. Esto es lo que impide
  // que el correo lleve a los clientes fuera del dominio.
  if (!ALLOWED_PATHS.has(ctaPath)) {
    return { ok: false, error: `Ruta del botón no permitida: ${ctaPath}` };
  }

  // Todo importe que aparezca en el texto debe existir en el catálogo.
  // Es la comprobación que atrapa el fallo más caro: anunciar un precio
  // que la tienda no va a respetar.
  const known = new Set<string>();
  for (const p of products) {
    known.add(String(p.price));
    known.add(p.price.toLocaleString("es-CO"));
  }
  known.add(String(FREE_SHIPPING_FROM));
  known.add(FREE_SHIPPING_FROM.toLocaleString("es-CO"));

  const full = [subject, preheader, headline, ...paragraphs].join(" ");
  // Números de cinco cifras o más: los precios de esta tienda. Se ignoran
  // los años y las cifras pequeñas, que no son promesas de precio.
  const amounts = full.match(/\d[\d.,]{4,}/g) ?? [];
  for (const raw of amounts) {
    const normalized = raw.replace(/[.,]$/, "");
    const digitsOnly = normalized.replace(/[.,]/g, "");
    if (!known.has(normalized) && !known.has(digitsOnly)) {
      return {
        ok: false,
        error: `El texto menciona un importe que no está en el catálogo: ${raw}`,
      };
    }
  }

  return {
    ok: true,
    update: {
      subject,
      preheader,
      model,
      body: { headline, paragraphs, ctaLabel, ctaUrl: ctaPath },
    },
  };
}
