/**
 * Descuento del inventario cuando una compra queda pagada.
 *
 * Cómo funciona, y por qué así:
 *
 * La hoja de Google es pública SOLO PARA LEER — eso es lo que permite
 * que la tienda la consulte sin credenciales, y lo que impide que un
 * desconocido con el enlace cambie el inventario. Para escribir en ella
 * hace falta permiso, y ese permiso vive en un pequeño script que la
 * dueña de la hoja publica desde la hoja misma (Extensiones > Apps
 * Script). El script corre con SU cuenta, no con la del servidor.
 *
 *   webhook de Wompi (APPROVED)
 *     -> este módulo
 *     -> POST al script publicado (con un token compartido)
 *     -> el script resta en la celda y apunta el movimiento
 *
 * Tres cosas que el script hace y este lado no podría hacer solo:
 *
 *  1. Bloqueo. Dos compras a la vez de la misma pieza se atienden en
 *     fila (LockService), así que no se pierde ninguna resta. Leer,
 *     restar y escribir desde aquí sería una carrera perdida.
 *  2. Idempotencia por referencia de pedido. Si el mismo pedido llega
 *     dos veces, la segunda no descuenta.
 *  3. Registro. Cada movimiento queda apuntado en una pestaña, que es
 *     el rastro que se mira cuando un número no cuadra.
 *
 * SECURITY_RULES Regla 3: el token es un secreto de servidor. No lleva
 * prefijo VITE_ y viaja en el CUERPO de la petición, nunca en la URL —
 * las URLs quedan en registros y en historiales.
 */

import { products } from "@/lib/products";
import { findOrderItems } from "@/lib/orders";
import { readEnv } from "@/lib/runtime-env";
import { invalidateAvailabilityCache } from "@/lib/availability-sheet";

/** Si el script no responde en este tiempo, se abandona el intento. */
const TIMEOUT_MS = 10_000;

/**
 * Único destino aceptado. Aquí se manda qué se vendió y cuánto, así que
 * una variable mal puesta no puede acabar enviando esa información a un
 * sitio cualquiera: si la URL no es de Apps Script, no se llama.
 */
const ALLOWED_HOST = "script.google.com";

export type DeductionItem = {
  slug: string;
  name: string;
  qty: number;
  /** Vacíos si el pedido no traía variante — el script resta a nivel de producto. */
  size: string;
  color: string;
};

export type DeductionResult = {
  ok: boolean;
  /** Qué pasó, en una línea, para el registro del servidor. */
  detail: string;
  /**
   * Piezas que el script no encontró en la hoja. Se vendieron y su
   * número NO bajó, así que esto nunca puede quedar en silencio: casi
   * siempre significa que alguien renombró una fila.
   */
  notFound: string[];
};

function writeUrl(): string | null {
  const raw = readEnv("GOOGLE_SHEET_WRITE_URL")?.trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    console.error("[inventario] GOOGLE_SHEET_WRITE_URL no es una URL válida");
    return null;
  }

  if (url.protocol !== "https:" || url.hostname !== ALLOWED_HOST) {
    console.error(
      `[inventario] GOOGLE_SHEET_WRITE_URL debe ser https://${ALLOWED_HOST}/...; se ignora`,
    );
    return null;
  }

  return url.toString();
}

function writeToken(): string | null {
  const value = readEnv("GOOGLE_SHEET_WRITE_TOKEN")?.trim();
  return value ? value : null;
}

/** `true` si el descuento automático está montado y encendido. */
export function stockWriteConfigured(): boolean {
  return writeUrl() !== null && writeToken() !== null;
}

/** Nombre visible de una pieza, para que el script pueda emparejar. */
function catalogName(slug: string): string {
  return products.find((p) => p.slug === slug)?.name ?? "";
}

/**
 * Manda el descuento al script de la hoja.
 *
 * Nunca lanza. Un fallo aquí no puede tumbar el webhook: el dinero ya
 * se cobró y el pedido ya está guardado. Lo que hace es devolver el
 * motivo para que quien llama lo deje escrito bien visible.
 */
export async function deductStock(
  reference: string,
  items: DeductionItem[],
): Promise<DeductionResult> {
  const url = writeUrl();
  const token = writeToken();

  if (!url || !token) {
    return { ok: false, detail: "descuento no configurado", notFound: [] };
  }
  if (items.length === 0) {
    return { ok: false, detail: "el pedido no traía piezas", notFound: [] };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      // Apps Script responde con una redirección a googleusercontent;
      // sin seguirla no se ve nunca el resultado.
      redirect: "follow",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, reference, items }),
    });

    const text = await response.text();

    if (!response.ok) {
      return {
        ok: false,
        detail: `el script respondió HTTP ${response.status}`,
        notFound: [],
      };
    }

    let payload: {
      ok?: unknown;
      error?: unknown;
      applied?: unknown;
      notFound?: unknown;
    };
    try {
      payload = JSON.parse(text) as typeof payload;
    } catch {
      // Cuando el despliegue no es público, Apps Script devuelve una
      // página de login en HTML en vez de JSON.
      return {
        ok: false,
        detail:
          "el script no devolvió JSON: revisa que esté implementado con acceso «cualquier usuario»",
        notFound: [],
      };
    }

    if (payload.ok !== true) {
      const motivo =
        typeof payload.error === "string" ? payload.error : "motivo no dicho";
      return {
        ok: false,
        detail: `el script rechazó el descuento: ${motivo}`,
        notFound: [],
      };
    }

    // El número de la hoja acaba de cambiar: que la próxima visita lo vea.
    invalidateAvailabilityCache();

    const aplicados = Array.isArray(payload.applied)
      ? payload.applied.length
      : items.length;
    const notFound = Array.isArray(payload.notFound)
      ? payload.notFound.map((value) => String(value))
      : [];
    return {
      ok: true,
      detail: `${aplicados} pieza(s) descontada(s)`,
      notFound,
    };
  } catch (error) {
    const motivo =
      error instanceof Error && error.name === "AbortError"
        ? "el script tardó demasiado"
        : "no se pudo contactar con el script";
    return { ok: false, detail: motivo, notFound: [] };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Descuenta lo que llevaba un pedido ya pagado.
 *
 * Se llama desde el webhook, y solo cuando la compra quedó APPROVED: un
 * pedido iniciado y no pagado no puede restar inventario.
 *
 * Si algo falla se deja el aviso con todo lo necesario para arreglarlo a
 * mano —referencia y piezas—, porque el reintento de Wompi no sirve
 * aquí: la deduplicación de eventos lo descartaría por repetido.
 */
export async function applyStockDeduction(reference: string): Promise<void> {
  if (!stockWriteConfigured()) return;

  const items = await findOrderItems(reference);
  if (items.length === 0) {
    console.warn(
      `[inventario] ${reference}: sin piezas guardadas, no se descuenta nada`,
    );
    return;
  }

  const deduction: DeductionItem[] = items.map((item) => ({
    slug: item.slug,
    name: item.name || catalogName(item.slug),
    qty: item.qty,
    size: item.size || "",
    color: item.color || "",
  }));

  const resumen = deduction
    .map((i) => `${i.slug}${i.size || i.color ? ` (${i.size} ${i.color})`.trim() : ""} x${i.qty}`)
    .join(", ");
  const result = await deductStock(reference, deduction);

  if (result.ok) {
    console.log(`[inventario] ${reference}: ${result.detail} (${resumen})`);

    if (result.notFound.length > 0) {
      // Se vendió, se cobró, y ese número no bajó. Suele ser una fila
      // renombrada en la hoja.
      console.error(
        `[inventario] ${reference}: la hoja no tiene fila para ${result.notFound.join(", ")}; ajustar a mano`,
      );
    }
    return;
  }

  // Visible a propósito: aquí se vendió algo cuyo inventario no bajó, y
  // eso hay que corregirlo en la hoja a mano.
  console.error(
    `[inventario] ${reference}: NO se descontó (${result.detail}). Ajustar a mano en la hoja: ${resumen}`,
  );
}
