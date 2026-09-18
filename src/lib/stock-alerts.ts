/**
 * Avisos de inventario a los SUSCRIPTORES del boletín: "ya hay
 * disponibilidad" y "última unidad". A diferencia del resto de tareas
 * de este archivo (aviso de compra, reporte semanal), este no es un
 * correo interno para el dueño de la tienda — es un correo de
 * marketing real, a toda la lista activa de `newsletter`.
 *
 * Corre junto al resto de tareas programadas diarias
 * (`checkForCatalogUpdates`, `checkLaunchReminders`) desde el
 * `scheduled()` de `src/server.ts`. Compara lo que hoy dice la hoja de
 * disponibilidad (`availability-sheet.ts`) contra la última cantidad
 * guardada en `stock_alerts_snapshot` (`supabase/migrations/0011_...`):
 *
 *  - si una variante SUBIÓ de cantidad (por ejemplo de 0 a 5), es que
 *    alguien acaba de reponerla → entra en "ya hay disponibilidad";
 *  - si una variante BAJÓ a exactamente 1 (y no estaba ya en 1), es la
 *    última unidad → entra en "última unidad";
 *  - cualquier otro cambio (bajó pero no a 1, subió pero venía de más
 *    de 1) no dispara nada, solo actualiza el número guardado.
 *
 * La primera vez que se ve una clave (no hay fila previa en la tabla)
 * nunca dispara aviso: es la foto inicial, no un cambio real. Sin esto,
 * la primera corrida avisaría "hay disponibilidad" de todo el catálogo
 * a la vez.
 *
 * Varias variantes del mismo producto (dos tallas, dos colores) se
 * agrupan en UNA sola tarjeta por producto en el correo — a quien
 * compra no le importa cuántas filas trae la hoja, le importa la
 * prenda.
 */

import { serviceClient } from "@/lib/supabase-server";
import { getAvailability } from "@/lib/availability-sheet";
import { getProduct, defaultImage, formatPrice } from "@/lib/products";
import { sendEmail, emailConfigured } from "@/lib/email";
import {
  renderStockAlertEmail,
  type StockAlertProduct,
} from "@/lib/email-templates";
import { siteUrl, unsubscribeUrl } from "@/lib/newsletter";

/** Mismos límites que el resto de envíos a la lista (`newsletter-*.ts`). */
const MAX_PER_RUN = 200;
const CONCURRENCY = 5;

type Change = { slug: string; detail: string | undefined; count: number };

/**
 * "nala::m::negro" -> { slug: "nala", detail: "talla M, color negro" }.
 * `detail` queda `undefined` para stock a nivel de producto (sin
 * talla/color en la hoja), así la tarjeta no muestra un paréntesis
 * vacío.
 */
function parseKey(key: string): { slug: string; detail: string | undefined } {
  const [slug, size, color] = key.split("::");
  const parts: string[] = [];
  if (size) parts.push(`talla ${size.toUpperCase()}`);
  if (color) parts.push(`color ${color}`);
  return { slug: slug ?? key, detail: parts.length ? parts.join(", ") : undefined };
}

/**
 * Agrupa cambios por producto: si dos variantes de "Nala" cambiaron el
 * mismo día, sale UNA tarjeta de Nala, con los detalles de cada
 * variante unidos. Descarta slugs que ya no existen en el catálogo.
 */
function toProducts(changes: Change[]): StockAlertProduct[] {
  const bySlug = new Map<string, Change[]>();
  for (const change of changes) {
    const list = bySlug.get(change.slug) ?? [];
    list.push(change);
    bySlug.set(change.slug, list);
  }

  const toAbsolute = (path: string) =>
    path.startsWith("http") ? path : `${siteUrl()}${path}`;

  const result: StockAlertProduct[] = [];
  for (const [slug, list] of bySlug) {
    const product = getProduct(slug);
    if (!product) continue;

    const details = list.map((c) => c.detail).filter((d): d is string => !!d);
    result.push({
      name: product.name,
      ...(details.length > 0 ? { detail: details.join(" · ") } : {}),
      price: formatPrice(product.price),
      image: toAbsolute(defaultImage(product)),
      url: `${siteUrl()}/producto/${product.slug}`,
    });
  }
  return result;
}

export type StockAlertsResult =
  | { ran: false; reason: string }
  | { ran: true; restocked: number; lowStock: number; sent: number; failed: number };

/**
 * Revisa el inventario y, si hay cambios que avisar, le escribe a toda
 * la lista activa de suscriptores. Nunca lanza: cualquier fallo de
 * envío se registra y se traga, y un fallo leyendo la hoja simplemente
 * no hace nada este ciclo (la próxima corrida lo vuelve a intentar).
 */
export async function checkStockAlerts(): Promise<StockAlertsResult> {
  const db = serviceClient();
  if (!db) return { ran: false, reason: "Base de datos no configurada." };

  const snapshot = await getAvailability();
  // Un error o una hoja sin configurar no trae un inventario real: no
  // se puede comparar contra "nada", porque cada clave leería como que
  // bajó a 0. Se espera a la próxima corrida en vez de mandar avisos
  // falsos a toda la lista.
  if (snapshot.source === "error" || snapshot.source === "unconfigured") {
    return { ran: false, reason: snapshot.error ?? "Hoja no configurada." };
  }

  const { data: previousRows, error } = await db
    .from("stock_alerts_snapshot")
    .select("key, count");

  if (error) {
    console.error("[stock] no se pudo leer el snapshot previo:", error.message);
    return { ran: false, reason: error.message };
  }

  const previous = new Map<string, number>(
    (previousRows ?? []).map((row) => [
      String(row["key"]),
      Number(row["count"]),
    ]),
  );

  const restockedChanges: Change[] = [];
  const lowStockChanges: Change[] = [];
  const upserts: { key: string; count: number }[] = [];

  for (const [key, count] of Object.entries(snapshot.stock)) {
    const before = previous.get(key);
    upserts.push({ key, count });

    // Primera vez que se ve esta clave: se guarda como referencia, sin
    // avisar — no es un cambio, es la foto inicial.
    if (before === undefined) continue;

    const { slug, detail } = parseKey(key);
    if (count > before) {
      restockedChanges.push({ slug, detail, count });
    } else if (count === 1 && before !== 1) {
      lowStockChanges.push({ slug, detail, count });
    }
  }

  if (upserts.length > 0) {
    const { error: upsertError } = await db
      .from("stock_alerts_snapshot")
      .upsert(upserts, { onConflict: "key" });
    if (upsertError) {
      console.error(
        "[stock] no se pudo guardar el snapshot nuevo:",
        upsertError.message,
      );
    }
  }

  const restocked = toProducts(restockedChanges);
  const lowStock = toProducts(lowStockChanges);

  if (restocked.length === 0 && lowStock.length === 0) {
    return { ran: true, restocked: 0, lowStock: 0, sent: 0, failed: 0 };
  }

  if (!emailConfigured()) {
    return {
      ran: false,
      reason: "Falta RESEND_API_KEY.",
    };
  }

  const { data: subscribers, error: listError } = await db
    .from("newsletter")
    .select("email, unsubscribe_token")
    .is("unsubscribed_at", null)
    .limit(MAX_PER_RUN);

  if (listError) {
    return { ran: false, reason: "No se pudo leer la lista de suscriptores." };
  }

  const recipients = (subscribers ?? []) as {
    email: string;
    unsubscribe_token: string;
  }[];

  let sent = 0;
  let failed = 0;
  const ctaUrl = `${siteUrl()}/tienda`;

  for (let i = 0; i < recipients.length; i += CONCURRENCY) {
    const batch = recipients.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (person) => {
        const link = unsubscribeUrl(person.unsubscribe_token);
        const { subject, html, text } = renderStockAlertEmail({
          restocked,
          lowStock,
          ctaUrl,
          unsubscribeUrl: link,
        });
        return sendEmail({
          to: person.email,
          subject,
          html,
          text,
          unsubscribeUrl: link,
        });
      }),
    );
    for (const result of results) {
      if (result.ok) sent++;
      else failed++;
    }
  }

  console.log(
    `[stock] aviso de inventario · reposiciones=${restocked.length} · ultima_unidad=${lowStock.length} · enviados=${sent} · fallidos=${failed}`,
  );

  return {
    ran: true,
    restocked: restocked.length,
    lowStock: lowStock.length,
    sent,
    failed,
  };
}
