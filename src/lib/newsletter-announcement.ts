/**
 * Anuncio de catálogo: "hay novedades" con datos reales, sin IA de por
 * medio.
 *
 * Se diferencia de `newsletter-campaign.ts` (que hace escribir el
 * texto a un modelo) en que aquí el contenido es siempre el mismo
 * molde — foto, nombre y precio de cada prenda, tal como están en
 * `products.ts` — así que no depende de `ANTHROPIC_API_KEY` y no hay
 * forma de que el correo diga algo distinto del catálogo real.
 *
 * `sendCatalogAnnouncement` es el envío en sí, y lo usan dos caminos:
 *  - `handleAnnouncement` — a mano, por HTTP, protegido con
 *    NEWSLETTER_ADMIN_TOKEN (mismo token que las campañas de IA).
 *  - `catalog-watch.ts` — solo, una vez al día, cuando detecta una
 *    prenda nueva o un cambio de precio (ver ese archivo).
 *
 * SECURITY_RULES Regla 10: el token se compara en tiempo constante.
 * SECURITY_RULES Regla 11: no se registra ninguna dirección de correo.
 */

import { z } from "zod";
import { serviceClient } from "@/lib/supabase-server";
import { readEnv } from "@/lib/runtime-env";
import { constantTimeEqual, bearerToken } from "@/lib/constant-time";
import {
  renderCatalogAnnouncementEmail,
  type AnnouncementProduct,
} from "@/lib/email-templates";
import { sendEmail, emailConfigured } from "@/lib/email";
import { siteUrl, unsubscribeUrl } from "@/lib/newsletter";
import {
  products,
  defaultImage,
  formatPrice,
  getProduct,
} from "@/lib/products";

export const ANNOUNCEMENT_PATH = "/api/boletin/anuncio";

/** Mismos límites que `newsletter-campaign.ts`, mismo motivo. */
const MAX_PER_RUN = 200;
const CONCURRENCY = 5;

export type AnnouncementInput = {
  headline: string;
  intro: string;
  ctaLabel?: string | undefined;
  /**
   * Qué prendas mostrar, por slug. Sin este campo, se anuncia el
   * catálogo completo.
   */
  slugs?: string[] | undefined;
};

export type AnnouncementOutcome =
  | { ok: true; sent: number; failed: number; recipients: number }
  | { ok: false; reason: string };

/**
 * El envío en sí: arma las fotos/precios reales de las prendas
 * elegidas y le escribe a toda la lista activa, por tandas. Nunca
 * lanza — cualquier fallo vuelve como `{ ok: false, reason }`, para
 * que tanto el endpoint HTTP como la tarea programada decidan qué
 * hacer sin un try/catch a ciegas.
 */
export async function sendCatalogAnnouncement(
  input: AnnouncementInput,
): Promise<AnnouncementOutcome> {
  const chosen = input.slugs
    ? input.slugs.map(getProduct).filter((p): p is NonNullable<typeof p> => !!p)
    : products;

  if (chosen.length === 0) {
    return {
      ok: false,
      reason: "Ninguno de esos slugs existe en el catálogo.",
    };
  }

  const db = serviceClient();
  if (!db) return { ok: false, reason: "Base de datos no configurada." };
  if (!emailConfigured()) return { ok: false, reason: "Falta RESEND_API_KEY." };

  const ctaUrl = `${siteUrl()}/tienda`;
  const ctaLabel = input.ctaLabel ?? "Ver la colección";
  // Las fotos del catálogo son rutas relativas al propio sitio
  // (`/assets/...` una vez compilado). Un correo no tiene "propio
  // sitio": si no se les pega el dominio delante, el cliente de
  // correo no encuentra de dónde cargarlas.
  const toAbsolute = (path: string) =>
    path.startsWith("http") ? path : `${siteUrl()}${path}`;
  const announcementProducts: AnnouncementProduct[] = chosen.map((p) => ({
    name: p.name,
    price: formatPrice(p.price),
    image: toAbsolute(defaultImage(p)),
    url: `${siteUrl()}/producto/${p.slug}`,
  }));

  const { data: subscribers, error: listError } = await db
    .from("newsletter")
    .select("email, unsubscribe_token")
    .is("unsubscribed_at", null)
    .limit(MAX_PER_RUN);

  if (listError) return { ok: false, reason: "No se pudo leer la lista." };

  const recipients = (subscribers ?? []) as {
    email: string;
    unsubscribe_token: string;
  }[];
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += CONCURRENCY) {
    const batch = recipients.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (person) => {
        const link = unsubscribeUrl(person.unsubscribe_token);
        const email = renderCatalogAnnouncementEmail({
          headline: input.headline,
          intro: input.intro,
          products: announcementProducts,
          ctaLabel,
          ctaUrl,
          unsubscribeUrl: link,
        });
        return sendEmail({
          to: person.email,
          subject: input.headline,
          html: email.html,
          text: email.text,
          unsubscribeUrl: link,
        });
      }),
    );

    for (const result of results) {
      if (result.ok) sent++;
      else failed++;
    }
  }

  // Se registra el recuento, nunca a quién se escribió (Regla 11).
  console.log(
    `[boletin] anuncio de catálogo · prendas=${announcementProducts.length} · enviados=${sent} fallidos=${failed}`,
  );

  return { ok: true, sent, failed, recipients: recipients.length };
}

/** Solo para `?dryRun=1`: arma el correo sin mandarlo ni tocar la base. */
function previewCatalogAnnouncement(input: AnnouncementInput) {
  const chosen = input.slugs
    ? input.slugs.map(getProduct).filter((p): p is NonNullable<typeof p> => !!p)
    : products;

  const toAbsolute = (path: string) =>
    path.startsWith("http") ? path : `${siteUrl()}${path}`;
  const announcementProducts: AnnouncementProduct[] = chosen.map((p) => ({
    name: p.name,
    price: formatPrice(p.price),
    image: toAbsolute(defaultImage(p)),
    url: `${siteUrl()}/producto/${p.slug}`,
  }));

  return renderCatalogAnnouncementEmail({
    headline: input.headline,
    intro: input.intro,
    products: announcementProducts,
    ctaLabel: input.ctaLabel ?? "Ver la colección",
    ctaUrl: `${siteUrl()}/tienda`,
    unsubscribeUrl: `${siteUrl()}/api/boletin/baja?t=EJEMPLO`,
  });
}

const bodySchema = z.object({
  headline: z.string().trim().min(1).max(120),
  intro: z.string().trim().min(1).max(400),
  ctaLabel: z.string().trim().min(1).max(40).optional(),
  slugs: z.array(z.string()).max(20).optional(),
});

export async function handleAnnouncement(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: "Method Not Allowed" }, 405);
  }

  // Mismo token que las campañas de IA: es la misma clase de acción.
  const adminToken = readEnv("NEWSLETTER_ADMIN_TOKEN");
  if (!adminToken) {
    return json(
      {
        error:
          "El endpoint de anuncios está apagado. Configura NEWSLETTER_ADMIN_TOKEN para habilitarlo.",
      },
      503,
    );
  }

  if (!constantTimeEqual(bearerToken(request), adminToken)) {
    return json({ error: "No autorizado." }, 401);
  }

  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";

  let input: AnnouncementInput;
  try {
    const raw = await request.text();
    input = bodySchema.parse(JSON.parse(raw));
  } catch {
    return json({ error: "Cuerpo inválido." }, 400);
  }

  if (dryRun) {
    const preview = previewCatalogAnnouncement(input);
    return json({ dryRun: true, headline: input.headline, ...preview });
  }

  const outcome = await sendCatalogAnnouncement(input);
  if (!outcome.ok) return json({ error: outcome.reason }, 422);

  return json({
    headline: input.headline,
    recipients: outcome.recipients,
    sent: outcome.sent,
    failed: outcome.failed,
    truncated: outcome.recipients === MAX_PER_RUN,
  });
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
