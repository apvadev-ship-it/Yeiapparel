import {
  findOrder,
  markOrderStatus,
  TERMINAL_ORDER_STATUSES,
} from "@/lib/orders";
import { readEnv } from "@/lib/runtime-env";
import { applyStockDeduction } from "@/lib/stock-deduct";
import { redeemCoupon } from "@/lib/coupons";
import { fetchTransaction } from "@/lib/wompi-api";
import {
  claimWebhookEvent,
  markWebhookEventProcessed,
} from "@/lib/webhook-dedup";
import { notifyOrderApproved } from "@/lib/order-notify";

/**
 * Webhook de eventos de Wompi.
 *
 * Documentación: https://docs.wompi.co/docs/colombia/eventos/
 *
 * Esta es la ÚNICA confirmación válida de que un pago ocurrió. Que el
 * comprador regrese del checkout no prueba nada: pudo cerrar la pestaña,
 * o pudo escribir la URL de retorno a mano. El dinero solo se da por
 * recibido cuando llega este evento, su firma cuadra y —esto es lo que
 * faltaba— la propia Wompi confirma el estado cuando se lo preguntamos.
 *
 * Cómo se valida la firma (esquema de Wompi, verificado 2026-05-20):
 * se concatenan, en orden, los valores de los campos que el propio evento
 * lista en `signature.properties`, luego el `timestamp`, y al final el
 * secreto de eventos. SHA-256 sobre esa cadena, en hexadecimal, y se
 * compara contra `signature.checksum`.
 *
 * Las cinco defensas de este archivo, y por qué está cada una:
 *
 *  1. Regla 1 — el cuerpo crudo se lee UNA sola vez y la firma se
 *     verifica antes de que ese contenido toque nada del negocio.
 *  2. Regla 9 — se firma con WOMPI_EVENTS_SECRET, nunca con la llave
 *     pública ni con el secreto de integridad. Son secretos distintos
 *     para propósitos distintos.
 *  3. Regla 10 — la comparación de firmas es en tiempo constante.
 *  4. Regla 2 — repetición: ventana de tiempo sobre el `timestamp` MÁS
 *     deduplicación por evento en base de datos. Las dos, no una.
 *  5. Lo más importante: el cuerpo del evento NO es la verdad
 *     (`payload_authoritative: false`). Con la firma ya validada, se le
 *     vuelve a preguntar a Wompi por la transacción y se actúa según esa
 *     respuesta. Así, un evento viejo reenviado no puede mover el pedido
 *     a un estado que ya no es el real.
 */

/** Ruta donde escucha el webhook. Se registra en el panel de Wompi. */
export const WOMPI_WEBHOOK_PATH = "/api/wompi/eventos";

/**
 * Tope al cuerpo del evento. Un webhook de Wompi pesa unos pocos KB;
 * 256 KB es holgado y evita que alguien mande megas para agotar la
 * memoria y la CPU del Worker.
 */
const MAX_BODY_BYTES = 256 * 1024;

/**
 * Ventana de tolerancia del `timestamp`, en segundos. Es la que
 * recomienda Wompi. Ojo: no se usa para rechazar a secas, ver abajo.
 */
const TIMESTAMP_TOLERANCE_SECONDS = 600;

/** Eventos que este handler sabe atender. */
const HANDLED_EVENTS = new Set(["transaction.updated"]);

/** Estados de transacción que Wompi puede devolver. */
const KNOWN_STATUSES = new Set([
  "APPROVED",
  "DECLINED",
  "VOIDED",
  "ERROR",
  "PENDING",
]);

type WompiEvent = {
  event?: string;
  data?: Record<string, unknown>;
  signature?: { checksum?: string; properties?: string[] };
  timestamp?: number;
};

/** Lee "transaction.status" dentro del objeto data. */
function readPath(source: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      source,
    );
}

async function sha256Hex(input: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Comparación en tiempo constante de dos digests en hexadecimal.
 *
 * SECURITY_RULES Regla 10. Un `===` normal se detiene en la primera
 * letra distinta, y ese diferencial de tiempo, medido muchas veces,
 * permite reconstruir la firma carácter por carácter.
 *
 * Detalles que importan: no hay salida anticipada en ningún caso, ni
 * siquiera cuando las longitudes difieren (la diferencia de longitud se
 * mezcla en el acumulador). Se recorre siempre el largo mayor. Fuera de
 * rango, `charCodeAt` da NaN y el `| 0` lo vuelve 0, así que el bucle no
 * se corta ni lanza.
 *
 * No se usa `crypto.timingSafeEqual` porque en Cloudflare Workers no
 * existe: en este runtime no hay `node:crypto`.
 */
function constantTimeHexEqual(a: string, b: string): boolean {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();

  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);

  for (let i = 0; i < length; i++) {
    diff |= (left.charCodeAt(i) | 0) ^ (right.charCodeAt(i) | 0);
  }

  return diff === 0;
}

function nowInSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export type ChecksumResult =
  | { ok: true }
  /** Al evento le faltan campos para poder verificarlo. */
  | { ok: false; reason: "malformed" }
  /** Falta en `data` una de las propiedades que la firma dice cubrir. */
  | { ok: false; reason: "missing_property"; path: string }
  /** La firma no coincide: el evento no viene de Wompi o fue alterado. */
  | { ok: false; reason: "mismatch" };

/**
 * Verifica la firma (`signature.checksum`) de un evento de Wompi.
 *
 * SECURITY_RULES Regla 9: el `secret` que entra aquí tiene que ser
 * WOMPI_EVENTS_SECRET. Ni la llave pública ni el secreto de integridad
 * sirven para esto, y usarlos daría un falso negativo permanente.
 *
 * Wompi no firma el cuerpo entero (`signature_covers_body: false`): firma
 * solo los valores de las propiedades que el propio evento lista, en ese
 * orden, más el `timestamp` y el secreto. Por eso hay que parsear antes
 * de verificar. Lo que no se hace nunca es actuar sobre esos datos antes
 * de que esta función diga que sí.
 */
export async function verifyWompiChecksum(
  event: WompiEvent,
  secret: string,
): Promise<ChecksumResult> {
  const properties = event.signature?.properties;
  const checksum = event.signature?.checksum;
  const timestamp = event.timestamp;

  if (
    !Array.isArray(properties) ||
    !checksum ||
    typeof timestamp !== "number"
  ) {
    return { ok: false, reason: "malformed" };
  }

  // Se concatenan los valores en el orden que dicta el propio evento.
  let payload = "";
  for (const path of properties) {
    const value = readPath(event.data, path);
    if (value === undefined || value === null) {
      return { ok: false, reason: "missing_property", path };
    }
    payload += String(value);
  }
  payload += String(timestamp) + secret;

  const expected = await sha256Hex(payload);

  // Regla 10: comparación en tiempo constante, nunca `===`.
  if (!constantTimeHexEqual(expected, checksum)) {
    return { ok: false, reason: "mismatch" };
  }

  return { ok: true };
}

// @pagokit:signature-verified — la verificación vive en
// verifyWompiChecksum(), unas líneas más arriba, y se llama antes de
// tocar cualquier dato del evento.
export async function handleWompiWebhook(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Regla 9: el secreto de eventos, y solo ese.
  const secret = readEnv("WOMPI_EVENTS_SECRET");
  if (!secret) {
    console.error("[wompi] falta WOMPI_EVENTS_SECRET; evento descartado");
    // 500 para que Wompi reintente cuando el secreto ya esté puesto.
    return new Response("Not configured", { status: 500 });
  }

  // Tope de tamaño, primero por la cabecera para no llegar ni a leer.
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_BODY_BYTES) {
    return new Response("Payload Too Large", { status: 413 });
  }

  // Regla 1: el cuerpo crudo se lee UNA vez. El stream de una Request no
  // se puede volver a leer, así que todo lo demás trabaja sobre `raw`.
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  // Segunda comprobación de tamaño, para peticiones sin content-length
  // (envío por trozos). Aquí ya se leyó, pero corta antes de parsear.
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return new Response("Payload Too Large", { status: 413 });
  }

  let event: WompiEvent;
  try {
    event = JSON.parse(raw) as WompiEvent;
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const timestamp = event.timestamp;
  const eventType = event.event ?? "";

  // Regla 1: la firma se verifica ANTES de mirar nada del contenido.
  const verified = await verifyWompiChecksum(event, secret);

  if (!verified.ok && verified.reason === "mismatch") {
    // Firma inválida: o el evento no viene de Wompi, o fue alterado.
    console.error("[wompi] firma inválida; evento rechazado");
    return new Response("Invalid signature", { status: 401 });
  }

  if (!verified.ok) {
    if (verified.reason === "missing_property") {
      console.error(`[wompi] el evento no trae ${verified.path}`);
    }
    return new Response("Bad Request", { status: 400 });
  }

  // `verifyWompiChecksum` ya comprobó que el timestamp es numérico; esto
  // es para que TypeScript lo sepa también.
  if (typeof timestamp !== "number") {
    return new Response("Bad Request", { status: 400 });
  }

  // ---- A partir de aquí el evento es auténtico. ---------------------

  const transaction = (event.data?.["transaction"] ?? {}) as Record<
    string,
    unknown
  >;
  const transactionId = String(transaction["id"] ?? "");
  const bodyStatus = String(transaction["status"] ?? "").toUpperCase();
  const bodyReference = String(transaction["reference"] ?? "");

  if (!transactionId || !bodyStatus) {
    return new Response("Bad Request", { status: 400 });
  }

  // Registro mínimo: identificador, tipo y momento del evento. Nunca el
  // cuerpo completo, que trae datos personales del comprador.
  console.log(
    `[wompi] evento ${eventType || "(sin tipo)"} id=${transactionId} ts=${timestamp}`,
  );

  if (!HANDLED_EVENTS.has(eventType)) {
    // TODO: si en el panel de Wompi se suscriben más eventos (por ejemplo
    // `nequi_token.updated`), agregarlos a HANDLED_EVENTS y darles su
    // rama aquí. No se descartan en silencio: queda el registro de
    // arriba, y se responde 200 para que Wompi no reintente en vano.
    console.warn(`[wompi] evento sin manejador: ${eventType}`);
    return new Response("OK", { status: 200 });
  }

  // Regla 2, primera defensa: ventana de tiempo.
  //
  // Se evalúa aquí pero NO se rechaza de inmediato, y la razón importa:
  // Wompi reintenta a los 30 minutos, 3 horas y 24 horas con el cuerpo
  // original, o sea con el `timestamp` original. Rechazar todo lo que
  // pase de 600 s tiraría a la basura reintentos legítimos y dejaría
  // pedidos pagados sin confirmar. La defensa fuerte contra repeticiones
  // es la deduplicación de abajo, sumada a que el estado se vuelve a
  // consultar y por tanto un cuerpo viejo no puede mentir.
  const ageSeconds = Math.abs(nowInSeconds() - timestamp);
  const stale = ageSeconds > TIMESTAMP_TOLERANCE_SECONDS;

  // Regla 2, segunda defensa: deduplicación durable.
  //
  // Se apunta con el estado que trae el cuerpo, porque eso identifica
  // esta entrega concreta: los reintentos de Wompi repiten el mismo
  // cuerpo. El estado con el que se ACTÚA, en cambio, es el que conteste
  // Wompi unas líneas más abajo.
  const claim = await claimWebhookEvent({
    transactionId,
    eventType,
    transactionStatus: bodyStatus,
    reference: bodyReference || null,
    eventTimestamp: timestamp,
  });

  if (claim.result === "duplicate") {
    // Ya se procesó. Se responde 200 rápido para que Wompi deje de
    // reintentar; repetir el trabajo no cambiaría nada.
    console.log(`[wompi] evento repetido id=${transactionId}; sin acción`);
    return new Response("OK", { status: 200 });
  }

  if (stale && claim.result === "unavailable") {
    // Evento viejo y, además, sin forma de saber si ya se procesó. Sin
    // ninguna de las dos defensas en pie, se rechaza.
    console.error(
      `[wompi] evento fuera de ventana (${ageSeconds}s) y sin deduplicación; rechazado`,
    );
    return new Response("Stale event", { status: 400 });
  }

  if (stale) {
    console.warn(
      `[wompi] evento fuera de ventana (${ageSeconds}s); probable reintento de Wompi`,
    );
  }

  // ---- La verdad se le pide a Wompi, no al cuerpo del evento. -------
  const lookup = await fetchTransaction(transactionId);

  if (!lookup.ok && lookup.reason === "unavailable") {
    // No se pudo confirmar nada. Se pide reintento en vez de adivinar.
    console.error(
      `[wompi] no se pudo confirmar la transacción ${transactionId}`,
    );
    return new Response("Upstream unavailable", { status: 500 });
  }

  if (!lookup.ok) {
    // Wompi dice que esa transacción no existe. Reintentar no ayuda.
    console.error(`[wompi] transacción inexistente ${transactionId}`);
    return new Response("OK", { status: 200 });
  }

  const confirmed = lookup.transaction;
  const status = confirmed.status.toUpperCase();
  const reference = confirmed.reference || bodyReference;

  if (!KNOWN_STATUSES.has(status)) {
    console.warn(`[wompi] estado no reconocido: ${status}`);
  }

  if (
    bodyReference &&
    confirmed.reference &&
    bodyReference !== confirmed.reference
  ) {
    // El cuerpo y la API no coinciden. Manda la API; queda anotado.
    console.error(
      `[wompi] la referencia del evento no coincide con la de la API (tx ${transactionId})`,
    );
  }

  if (!reference) {
    console.error(`[wompi] transacción sin referencia ${transactionId}`);
    return new Response("OK", { status: 200 });
  }

  // ---- Reglas de negocio sobre el pedido. ---------------------------
  const order = await findOrder(reference);

  // No retroceder: si el pedido ya está en un estado final, un PENDING
  // que llega tarde no lo devuelve para atrás.
  if (
    order &&
    status === "PENDING" &&
    TERMINAL_ORDER_STATUSES.has(order.status)
  ) {
    console.warn(
      `[wompi] ${reference} ya estaba en ${order.status}; se ignora PENDING tardío`,
    );
    await markWebhookEventProcessed(claim.eventKey);
    return new Response("OK", { status: 200 });
  }

  // Regla 6: el monto cobrado tiene que ser el que se firmó. Si no
  // cuadra, el pedido NO se aprueba solo: queda marcado para revisión.
  let finalStatus = status;
  if (
    order &&
    status === "APPROVED" &&
    order.amountInCents > 0 &&
    order.amountInCents !== confirmed.amountInCents
  ) {
    console.error(
      `[wompi] descuadre de monto en ${reference}: firmado ${order.amountInCents}, cobrado ${confirmed.amountInCents}`,
    );
    finalStatus = "REVIEW_AMOUNT_MISMATCH";
  }

  const saved = await markOrderStatus({
    reference,
    status: finalStatus,
    transactionId: confirmed.id,
    amountInCents: confirmed.amountInCents,
    ...(confirmed.paymentMethodType
      ? { paymentMethod: confirmed.paymentMethodType }
      : {}),
  });

  // Si no se pudo registrar, se responde con error a propósito: Wompi
  // reintenta a los 30 minutos, 3 horas y 24 horas.
  if (!saved) return new Response("Storage error", { status: 500 });

  // Inventario y cupón. Los dos se resuelven solo con la compra ya
  // pagada, nunca al iniciarla: un carrito que no se paga no puede
  // vaciar el atelier ni quemarle el cupón a nadie. Van después de
  // guardar el estado y antes de cerrar el evento, y ninguno interrumpe
  // la respuesta si falla — el cobro ya está hecho y lo peor que puede
  // pasar es algo que hay que corregir a mano.
  if (finalStatus === "APPROVED") {
    await applyStockDeduction(reference);
    if (order?.couponCode) {
      await redeemCoupon(order.couponCode, reference);
    }
    await notifyOrderApproved(reference).catch((error) => {
      console.error(`[aviso-compra] falló para ${reference}:`, error);
    });
  }

  await markWebhookEventProcessed(claim.eventKey);

  console.log(`[wompi] ${reference} → ${finalStatus}`);
  return new Response("OK", { status: 200 });
}
