/**
 * Reporte semanal de negocio: cuántas compras se hicieron, cuántas se
 * pagaron, ingresos, y los datos de los pedidos de los últimos 7 días.
 *
 * Por qué existe: `NOTIFY_EMAIL` ya recibe avisos puntuales de
 * /contacto (ver `contact-notify.ts`), pero nadie mira la tabla
 * `orders` a mano cada semana. Esta tarea corre sola desde el
 * `scheduled()` de `src/server.ts` (ver `wrangler.toml`, `[triggers]`)
 * y manda un resumen al mismo correo administrativo.
 *
 * La tabla completa de pedidos solo va por correo — no cabe bien en un
 * mensaje de Telegram, a diferencia del aviso puntual de
 * `order-notify.ts`. Telegram solo recibe un aviso corto de que el
 * reporte ya salió, para quien quiera enterarse sin abrir el correo. El
 * correo usa la plantilla con el logo real de la marca
 * (`renderWeeklyReportEmail`, en `email-templates.ts`) en vez de HTML
 * suelto — mismo diseño que el resto de correos de YEI.
 *
 * SECURITY_RULES Regla 11: el correo lleva nombre, correo, teléfono y
 * ciudad de envío de cada pedido — lo mínimo ya guardado en `orders`
 * para despachar y facturar. Nunca datos de tarjeta: esos no existen
 * en esta tabla.
 */

import { serviceClient } from "@/lib/supabase-server";
import { sendEmail, emailConfigured } from "@/lib/email";
import { sendTelegramMessage } from "@/lib/telegram";
import { readEnv } from "@/lib/runtime-env";
import {
  renderWeeklyReportEmail,
  type WeeklyReportOrderRow,
} from "@/lib/email-templates";

type OrderRow = {
  reference: string;
  status: string;
  total: number;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  shipping_city: string | null;
  created_at: string;
  paid_at: string | null;
};

export type WeeklyReportResult =
  | { ran: false; reason: string }
  | { ran: true; sentEmail: boolean; orderCount: number };

function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function buildReport(orders: OrderRow[], since: Date, until: Date) {
  const paid = orders.filter((o) => o.status === "APPROVED" || o.paid_at);
  const revenue = paid.reduce((sum, o) => sum + o.total, 0);
  const rangeLabel = `${since.toLocaleDateString("es-CO")} – ${until.toLocaleDateString("es-CO")}`;

  const rows: WeeklyReportOrderRow[] = orders.map((o) => ({
    dateLabel: new Date(o.created_at).toLocaleDateString("es-CO"),
    reference: o.reference,
    status: o.status,
    totalLabel: formatCOP(o.total),
    customerName: o.customer_name ?? "—",
    customerEmail: o.customer_email ?? "—",
    customerPhone: o.customer_phone ?? "—",
    shippingCity: o.shipping_city ?? "—",
  }));

  return renderWeeklyReportEmail({
    rangeLabel,
    orderCount: orders.length,
    paidCount: paid.length,
    revenueLabel: formatCOP(revenue),
    orders: rows,
  });
}

/**
 * Arma y manda el reporte de los últimos 7 días por correo (el detalle
 * completo) y, si Telegram está configurado, un aviso corto de que ya
 * salió. Si no hay `NOTIFY_EMAIL` o credenciales de correo, no envía
 * nada y se reporta la razón; nunca lanza excepción.
 */
export async function sendWeeklyReport(): Promise<WeeklyReportResult> {
  const to = readEnv("NOTIFY_EMAIL");
  if (!to || !emailConfigured()) {
    return {
      ran: false,
      reason: "NOTIFY_EMAIL o RESEND_API_KEY no configurados.",
    };
  }

  const db = serviceClient();
  if (!db) return { ran: false, reason: "Base de datos no configurada." };

  const until = new Date();
  const since = new Date(until.getTime() - 7 * 24 * 60 * 60 * 1000);

  const { data, error } = await db
    .from("orders")
    .select(
      "reference, status, total, customer_name, customer_email, customer_phone, shipping_city, created_at, paid_at",
    )
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[reporte-semanal] no se pudo leer pedidos:", error.message);
    return { ran: false, reason: error.message };
  }

  const orders = (data ?? []) as OrderRow[];
  const { subject, html, text } = buildReport(orders, since, until);

  const result = await sendEmail({ to, subject, html, text });
  if (!result.ok) {
    console.error("[reporte-semanal] fallo al enviar correo:", result.error);
  }

  // Telegram solo recibe el aviso de que el reporte salió, no la tabla
  // completa (esa solo va por correo — ver el comentario de arriba del
  // archivo). Es mejor esfuerzo: si falla, no cambia el resultado de
  // haber mandado o no el correo real.
  await sendTelegramMessage(
    `📊 El reporte semanal de YEI ha sido creado (${orders.length} pedidos). Revisa tu correo para el detalle.`,
  );

  return {
    ran: true,
    sentEmail: result.ok && result.mode === "sent",
    orderCount: orders.length,
  };
}
