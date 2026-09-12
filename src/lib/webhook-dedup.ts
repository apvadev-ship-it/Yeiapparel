import { serviceClient } from "@/lib/supabase-server";

/**
 * Deduplicación de eventos de Wompi.
 *
 * SECURITY_RULES Regla 2 (repetición de eventos): una firma válida sigue
 * siendo válida para siempre. Quien capture un evento legítimo puede
 * reenviarlo mil veces y todas pasarían la verificación. Contra eso hay
 * dos defensas y esta es la segunda:
 *
 *   1. ventana de tiempo (600 s) sobre el `timestamp` del evento;
 *   2. deduplicación por identificador, que es lo de este archivo.
 *
 * Por qué la clave no es solo el id de la transacción: Wompi manda varios
 * `transaction.updated` para la MISMA transacción a medida que cambia de
 * estado (PENDING y luego APPROVED, típico en PSE y Nequi). Si se
 * descartara por id a secas, el evento que confirma el pago se perdería.
 * Por eso la clave es `id:ESTADO`. Los reintentos de Wompi repiten el
 * mismo cuerpo (mismo id y mismo estado) y se descartan; los cambios de
 * estado pasan.
 *
 * Por qué en la base y no en memoria: en Cloudflare Workers cada petición
 * puede caer en un aislado distinto y la memoria se pierde. Un Set en
 * memoria no deduplica nada en producción.
 *
 * Tabla: supabase/migrations/0002_processed_webhook_events.sql
 */

export type ClaimResult =
  /** Primera vez que se ve este evento: hay que procesarlo. */
  | "claimed"
  /** Ya se había recibido: se responde 200 sin volver a hacer el trabajo. */
  | "duplicate"
  /** No hay base o falló la escritura: se sigue, pero queda avisado. */
  | "unavailable";

export type WebhookEventClaim = {
  transactionId: string;
  eventType: string;
  transactionStatus: string;
  reference: string | null;
  eventTimestamp: number;
};

/** Clave estable del evento: transacción + estado al que mueve. */
export function buildEventKey(
  transactionId: string,
  transactionStatus: string,
): string {
  return `${transactionId}:${transactionStatus.toUpperCase()}`;
}

/**
 * Intenta apuntar el evento como "recibido". Si ya estaba, avisa.
 *
 * El apunte se hace ANTES de tocar el pedido, para que dos entregas
 * simultáneas del mismo evento no se pisen: la primera inserta, la
 * segunda choca contra la llave primaria y se va por `duplicate`.
 */
export async function claimWebhookEvent(
  claim: WebhookEventClaim,
): Promise<{ result: ClaimResult; eventKey: string }> {
  const eventKey = buildEventKey(claim.transactionId, claim.transactionStatus);

  const db = serviceClient();
  if (!db) {
    // Sin base no hay deduplicación posible. Se avisa fuerte porque en
    // producción esto significa quedarse con una sola de las dos
    // defensas contra repeticiones.
    console.warn(
      "[wompi] sin Supabase configurado: no hay deduplicación de eventos",
    );
    return { result: "unavailable", eventKey };
  }

  const { error } = await db.from("processed_webhook_events").insert({
    event_key: eventKey,
    transaction_id: claim.transactionId,
    event_type: claim.eventType,
    transaction_status: claim.transactionStatus,
    reference: claim.reference,
    event_timestamp: claim.eventTimestamp,
  });

  if (!error) return { result: "claimed", eventKey };

  // 23505 = violación de llave única en Postgres: ya estaba apuntado.
  if (error.code === "23505") return { result: "duplicate", eventKey };

  console.error("[wompi] no se pudo apuntar el evento:", error.message);
  return { result: "unavailable", eventKey };
}

/**
 * Marca el evento como terminado, una vez el pedido quedó actualizado.
 *
 * Si esto falla no se rompe nada: el evento ya está apuntado y el pedido
 * ya está bien. La marca sirve para auditar, no para decidir.
 */
export async function markWebhookEventProcessed(
  eventKey: string,
): Promise<void> {
  const db = serviceClient();
  if (!db) return;

  const { error } = await db
    .from("processed_webhook_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("event_key", eventKey);

  if (error) {
    console.error("[wompi] no se pudo cerrar el evento:", error.message);
  }
}
