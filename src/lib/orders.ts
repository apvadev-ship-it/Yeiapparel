import { createServerFn } from "@tanstack/react-start";
import { serviceClient } from "@/lib/supabase-server";
import { toMinorUnits } from "@/lib/money";

/**
 * Registro de pedidos, del lado del servidor.
 *
 * Se usa la clave de servicio (`SUPABASE_SERVICE_ROLE_KEY`), no la anónima,
 * por dos razones: la tabla `orders` debe quedar cerrada al navegador —
 * ahí van datos personales y montos —, y el webhook necesita escribir sin
 * sesión de usuario.
 *
 * Esa clave es SECRETA y solo existe en el servidor. Nunca lleva prefijo
 * VITE_, que la incrustaría en el código público.
 *
 * La estructura de la tabla ya no vive en este comentario: está versionada
 * en `supabase/migrations/0001_orders.sql`, con las mismas columnas de
 * siempre. Se movió para que la base y el código no se separen sin que
 * nadie lo note.
 *
 * SECURITY_RULES Regla 12: aquí no se guarda ni se recibe número de
 * tarjeta, CVV ni fecha de vencimiento. Esos datos los captura Wompi en su
 * propio dominio y no pasan por este servidor.
 *
 * SECURITY_RULES Regla 11: se guardan solo los datos mínimos para
 * despachar y facturar el pedido.
 */

export type OrderItem = {
  slug: string;
  name: string;
  qty: number;
  size: string;
  color: string;
  unit_price: number;
};

export type NewOrder = {
  reference: string;
  total: number;
  amountInCents: number;
  customer: {
    name: string;
    email: string;
    phone: string;
    document: string;
  };
  shipping: {
    address: string;
    city: string;
    notes: string;
  };
  items: OrderItem[];
  /** Código del cupón del boletín aplicado, si había uno válido. */
  couponCode: string | null;
  /** Descuento aplicado, en pesos. 0 si no había cupón. */
  discount: number;
};

export function ordersConfigured() {
  return serviceClient() !== null;
}

/**
 * Deja constancia del pedido antes de mandar al comprador a pagar.
 * Si falla, no se interrumpe la compra: es preferible cobrar y reconciliar
 * después con el webhook, que perder la venta.
 */
export async function savePendingOrder(order: NewOrder): Promise<void> {
  const db = serviceClient();
  if (!db) return;

  const { error } = await db.from("orders").insert({
    reference: order.reference,
    status: "PENDING",
    total: order.total,
    amount_in_cents: order.amountInCents,
    customer_name: order.customer.name,
    customer_email: order.customer.email,
    customer_phone: order.customer.phone,
    customer_document: order.customer.document,
    shipping_address: order.shipping.address,
    shipping_city: order.shipping.city,
    shipping_notes: order.shipping.notes || null,
    items: order.items,
    coupon_code: order.couponCode,
    discount_in_cents: toMinorUnits(order.discount),
  });

  if (error) console.error("[orders] no se pudo guardar el pedido:", error);
}

/**
 * Actualiza el pedido cuando Wompi confirma el resultado.
 * Devuelve `false` si había base de datos pero la escritura falló, para que
 * el webhook responda con error y Wompi reintente.
 */
export async function markOrderStatus(input: {
  reference: string;
  status: string;
  transactionId: string;
  amountInCents: number;
  paymentMethod?: string;
}): Promise<boolean> {
  const db = serviceClient();
  if (!db) return true; // Nada donde escribir: no tiene sentido reintentar.

  const patch: Record<string, unknown> = {
    status: input.status,
    transaction_id: input.transactionId,
  };
  if (input.paymentMethod) patch["payment_method"] = input.paymentMethod;
  if (input.status === "APPROVED") patch["paid_at"] = new Date().toISOString();

  const { error } = await db
    .from("orders")
    .update(patch)
    .eq("reference", input.reference);

  if (error) {
    console.error("[orders] no se pudo actualizar el pedido:", error);
    return false;
  }
  return true;
}

/**
 * Las piezas de un pedido, tal como se guardaron al iniciarlo.
 *
 * Lo usa el descuento de inventario: el evento de Wompi solo trae la
 * transacción y el monto, no dice qué se compró. Lo que se vendió está
 * aquí, en la columna `items` que se escribió antes de cobrar.
 *
 * Devuelve lista vacía si no hay base, si el pedido no existe o si la
 * columna viene con algo que no son piezas. Quien llama no debe suponer
 * que hay algo que descontar.
 */
export async function findOrderItems(reference: string): Promise<OrderItem[]> {
  const db = serviceClient();
  if (!db) return [];

  const { data, error } = await db
    .from("orders")
    .select("items")
    .eq("reference", reference)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[orders] no se pudieron leer las piezas:", error);
    return [];
  }

  const raw = data["items"];
  if (!Array.isArray(raw)) return [];

  const items: OrderItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const slug = typeof row["slug"] === "string" ? row["slug"] : "";
    const qty = Number(row["qty"] ?? 0);
    // Una cantidad rara no se "corrige": se descarta, para no descontar
    // un número inventado del inventario.
    if (!slug || !Number.isFinite(qty) || qty <= 0) continue;

    items.push({
      slug,
      name: typeof row["name"] === "string" ? row["name"] : "",
      qty: Math.floor(qty),
      size: typeof row["size"] === "string" ? row["size"] : "",
      color: typeof row["color"] === "string" ? row["color"] : "",
      unit_price: Number(row["unit_price"] ?? 0),
    });
  }

  return items;
}

/** Lo que se necesita saber de un pedido ya guardado. */
export type StoredOrder = {
  reference: string;
  status: string;
  total: number;
  amountInCents: number;
  transactionId: string | null;
  paymentMethod: string | null;
  customerEmail: string | null;
  couponCode: string | null;
};

/**
 * Busca un pedido por su referencia.
 *
 * Lo usan el webhook y el endpoint de devoluciones para dos cosas:
 * comparar el monto que dice Wompi contra el monto que se firmó al
 * cobrar, y no repisar un estado final con uno anterior.
 *
 * Devuelve `null` tanto si no hay base configurada como si el pedido no
 * existe; quien llama decide qué hacer con cada caso.
 */
export async function findOrder(
  reference: string,
): Promise<StoredOrder | null> {
  const db = serviceClient();
  if (!db) return null;

  const { data, error } = await db
    .from("orders")
    .select(
      "reference, status, total, amount_in_cents, transaction_id, payment_method, customer_email, coupon_code",
    )
    .eq("reference", reference)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[orders] no se pudo leer el pedido:", error);
    return null;
  }

  return {
    reference: String(data["reference"]),
    status: String(data["status"] ?? ""),
    total: Number(data["total"] ?? 0),
    amountInCents: Number(data["amount_in_cents"] ?? 0),
    transactionId: data["transaction_id"]
      ? String(data["transaction_id"])
      : null,
    paymentMethod: data["payment_method"]
      ? String(data["payment_method"])
      : null,
    customerEmail: data["customer_email"]
      ? String(data["customer_email"])
      : null,
    couponCode: data["coupon_code"] ? String(data["coupon_code"]) : null,
  };
}

/**
 * Cuántas unidades de cada pieza se vendieron en los últimos 7 días,
 * de mayor a menor. Solo cuenta pedidos ya `APPROVED` (pagados de
 * verdad, no carritos abandonados) — por eso se filtra por `paid_at`
 * y no por `created_at`.
 *
 * La usa la home para armar "Lo más vendido de la semana"
 * (`src/routes/index.tsx` + `pickFeaturedProducts` en
 * `src/lib/products.ts`). Sin base configurada, o sin ventas todavía
 * esa semana, devuelve `[]` y quien llama cae a su propio respaldo.
 */
export const getWeeklyTopSellingSlugs = createServerFn({
  method: "GET",
}).handler(async (): Promise<{ slug: string; qty: number }[]> => {
  const db = serviceClient();
  if (!db) return [];

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await db
    .from("orders")
    .select("items")
    .eq("status", "APPROVED")
    .gte("paid_at", since);

  if (error || !data) {
    if (error) console.error("[orders] no se pudo leer lo más vendido:", error);
    return [];
  }

  const qtyBySlug = new Map<string, number>();
  for (const row of data) {
    const items = row["items"];
    if (!Array.isArray(items)) continue;
    for (const entry of items) {
      if (!entry || typeof entry !== "object") continue;
      const item = entry as Record<string, unknown>;
      const slug = typeof item["slug"] === "string" ? item["slug"] : "";
      const qty = Number(item["qty"] ?? 0);
      if (!slug || !Number.isFinite(qty) || qty <= 0) continue;
      qtyBySlug.set(slug, (qtyBySlug.get(slug) ?? 0) + qty);
    }
  }

  return [...qtyBySlug.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([slug, qty]) => ({ slug, qty }));
});

/** Estados de los que un pedido ya no debería retroceder. */
export const TERMINAL_ORDER_STATUSES = new Set([
  "APPROVED",
  "DECLINED",
  "VOIDED",
  "ERROR",
]);
