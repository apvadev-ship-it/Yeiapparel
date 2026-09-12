/**
 * Aviso inmediato de compra pagada: en cuanto el webhook de Wompi
 * confirma un pago (`finalStatus === "APPROVED"` en
 * `wompi-webhook.ts`), este módulo manda un correo a NOTIFY_EMAIL con
 * los datos del pedido. Es el complemento del reporte semanal
 * (`weekly-report.ts`): ese resume la semana, este avisa al momento.
 *
 * Se llama DESPUÉS de `markOrderStatus`, nunca antes: si el correo
 * falla, el pedido ya quedó guardado como pagado — perder este aviso
 * no puede perder la venta. Por eso nunca lanza: cualquier error se
 * registra y se traga, igual que el resto de pasos posteriores al
 * cobro en `wompi-webhook.ts` (inventario, cupón).
 *
 * El correo usa la plantilla con el logo real de la marca
 * (`renderOrderApprovedEmail`, en `email-templates.ts`) en vez de HTML
 * suelto — mismo diseño que el resto de correos de YEI.
 *
 * SECURITY_RULES Regla 11: el correo lleva nombre, correo, teléfono,
 * dirección y ciudad — lo mínimo ya guardado en `orders` para
 * despachar y facturar. Nunca datos de tarjeta.
 */

import { serviceClient } from "@/lib/supabase-server";
import { sendEmail, emailConfigured } from "@/lib/email";
import { sendTelegramMessage, telegramConfigured } from "@/lib/telegram";
import { readEnv } from "@/lib/runtime-env";
import {
  renderOrderApprovedEmail,
  type NotifiedOrderItem,
} from "@/lib/email-templates";

type OrderRow = {
  reference: string;
  total: number;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_document: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  items: NotifiedOrderItem[] | null;
};

function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Manda el aviso de una compra recién aprobada. No hace nada (y no
 * lanza) si falta `NOTIFY_EMAIL`, las credenciales de correo, o la
 * base de datos.
 */
export async function notifyOrderApproved(reference: string): Promise<void> {
  const to = readEnv("NOTIFY_EMAIL");
  const wantsEmail = Boolean(to && emailConfigured());
  const wantsTelegram = telegramConfigured();
  if (!wantsEmail && !wantsTelegram) return;

  const db = serviceClient();
  if (!db) return;

  const { data, error } = await db
    .from("orders")
    .select(
      "reference, total, customer_name, customer_email, customer_phone, customer_document, shipping_address, shipping_city, items",
    )
    .eq("reference", reference)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("[aviso-compra] no se pudo leer el pedido:", error.message);
    }
    return;
  }

  const order = data as OrderRow;
  const items = Array.isArray(order.items) ? order.items : [];

  const { subject, html, text } = renderOrderApprovedEmail({
    reference: order.reference,
    totalLabel: formatCOP(order.total),
    customerName: order.customer_name ?? "—",
    customerEmail: order.customer_email ?? "—",
    customerPhone: order.customer_phone ?? "—",
    customerDocument: order.customer_document ?? "—",
    shippingAddress: order.shipping_address ?? "—",
    shippingCity: order.shipping_city ?? "—",
    items,
  });

  await Promise.all([
    wantsEmail
      ? sendEmail({ to: to as string, subject, html, text }).then((result) => {
          if (!result.ok) {
            console.error("[aviso-compra] fallo al enviar correo:", result.error);
          }
        })
      : Promise.resolve(),
    wantsTelegram ? sendTelegramMessage(text) : Promise.resolve(),
  ]);
}
