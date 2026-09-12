import { findOrder } from "@/lib/orders";
import { readEnv } from "@/lib/runtime-env";
import { serviceClient } from "@/lib/supabase-server";
import { fetchTransaction, voidCardTransaction } from "@/lib/wompi-api";

/**
 * Devoluciones de dinero.
 *
 * SECURITY_RULES Regla 7 — y esta es la regla que manda en todo el
 * archivo: en Colombia la mayoría de lo que cobra Wompi NO se puede
 * devolver por API. PSE, Nequi, Botón Bancolombia, Transferencia
 * Bancolombia, Efecty, Baloto y SuRed son rieles irreversibles: el dinero
 * ya se movió de una cuenta a otra y no existe un "deshacer el cobro".
 * La única forma de regresarlo es que una persona del negocio haga una
 * transferencia bancaria.
 *
 * Por eso este endpoint no inventa una llamada de devolución que
 * fracasaría en producción. Se bifurca:
 *
 *   - tarjeta (CARD)  -> se pide la anulación a Wompi por API;
 *   - cualquier otro  -> se registra una OBLIGACIÓN DE PAGO en la tabla
 *                        `refund_requests`, con su monto y su estado, y
 *                        se responde diciendo con todas las letras que
 *                        alguien tiene que hacer la transferencia.
 *
 * El criterio por defecto es negar: si el medio de pago no es
 * exactamente CARD (incluso si es uno que Wompi agregue mañana y aquí no
 * esté listado), se trata como irreversible. Equivocarse hacia el lado
 * de "registrar una obligación" deja un pendiente visible; equivocarse
 * hacia el otro lado deja al comprador sin plata y sin rastro.
 *
 * SECURITY_RULES Regla 3: este endpoint es interno. Va protegido con
 * WOMPI_ADMIN_TOKEN y, si ese token no está configurado, queda apagado.
 * No tiene interfaz ni se llama desde el navegador.
 */

/** Ruta del endpoint interno de devoluciones. */
export const WOMPI_REFUND_PATH = "/api/wompi/reembolsos";

/** Tope al cuerpo: aquí solo llega un JSON pequeño. */
const MAX_BODY_BYTES = 32 * 1024;

/**
 * Único medio reversible por API. Todo lo demás se paga a mano.
 *
 * Los irreversibles conocidos hoy: PSE, NEQUI, BANCOLOMBIA_TRANSFER,
 * BANCOLOMBIA_COLLECT, BANCOLOMBIA_QR, BANCOLOMBIA_BUTTON, DAVIPLATA,
 * EFECTY, BALOTO, SU_RED, PCOL.
 */
const REVERSIBLE_BY_API = new Set(["CARD"]);

type RefundRequestBody = {
  reference?: unknown;
  reason?: unknown;
  amount_in_cents?: unknown;
  payout?: {
    bank?: unknown;
    account_type?: unknown;
    account_holder?: unknown;
    account_number?: unknown;
  };
};

/**
 * Comparación en tiempo constante para el token del endpoint.
 *
 * A propósito NO se reutiliza la del webhook: aquella normaliza a
 * minúsculas porque compara digests hexadecimales, y hacer eso con un
 * token secreto borraría la distinción entre mayúsculas y minúsculas,
 * o sea que le regalaría entropía a quien intente adivinarlo.
 *
 * Regla 10: sin salida anticipada; la diferencia de longitud se mezcla
 * en el acumulador y el bucle recorre siempre el largo mayor.
 */
function constantTimeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);

  for (let i = 0; i < length; i++) {
    diff |= (a.charCodeAt(i) | 0) ^ (b.charCodeAt(i) | 0);
  }

  return diff === 0;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function bearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
}

export async function handleWompiRefund(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: "Método no permitido." }, 405);
  }

  const adminToken = readEnv("WOMPI_ADMIN_TOKEN");
  if (!adminToken) {
    // Apagado por defecto: sin token configurado no se atiende. Es
    // preferible que no funcione a que quede abierto.
    return json(
      {
        error:
          "El endpoint de devoluciones está apagado. Configura WOMPI_ADMIN_TOKEN para habilitarlo.",
      },
      503,
    );
  }

  if (!constantTimeEqual(bearerToken(request), adminToken)) {
    // Sin detalles: no se le dice a quien prueba si falló el formato o
    // el valor.
    return json({ error: "No autorizado." }, 401);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_BODY_BYTES) {
    return json({ error: "Cuerpo demasiado grande." }, 413);
  }

  let body: RefundRequestBody;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
      return json({ error: "Cuerpo demasiado grande." }, 413);
    }
    body = JSON.parse(raw) as RefundRequestBody;
  } catch {
    return json({ error: "El cuerpo no es un JSON válido." }, 400);
  }

  const reference =
    typeof body.reference === "string" ? body.reference.trim() : "";
  if (!reference) {
    return json({ error: "Falta la referencia del pedido." }, 400);
  }

  const db = serviceClient();
  if (!db) {
    return json(
      {
        error:
          "No hay base de datos configurada: una devolución sin registro no se puede rastrear.",
      },
      503,
    );
  }

  const order = await findOrder(reference);
  if (!order) {
    return json({ error: `No existe el pedido ${reference}.` }, 404);
  }

  if (!order.transactionId) {
    return json(
      {
        error:
          "Ese pedido no tiene transacción asociada: nunca se llegó a cobrar.",
      },
      409,
    );
  }

  // El estado real lo dice Wompi, no la tabla local: el pedido pudo
  // haberse anulado desde el panel sin que este servidor se enterara.
  const lookup = await fetchTransaction(order.transactionId);
  if (!lookup.ok) {
    const message =
      lookup.reason === "not_found"
        ? "Wompi no reconoce esa transacción."
        : "No pudimos consultar la transacción en Wompi. Intenta de nuevo.";
    return json({ error: message }, lookup.reason === "not_found" ? 404 : 502);
  }

  const transaction = lookup.transaction;

  if (transaction.status.toUpperCase() !== "APPROVED") {
    return json(
      {
        error: `La transacción está en estado ${transaction.status}: no hay nada que devolver.`,
      },
      409,
    );
  }

  // Monto: por defecto se devuelve todo. Si se pide un monto, no puede
  // pasarse del cobrado.
  const requestedAmount =
    typeof body.amount_in_cents === "number"
      ? Math.floor(body.amount_in_cents)
      : transaction.amountInCents;

  if (requestedAmount <= 0 || requestedAmount > transaction.amountInCents) {
    return json(
      {
        error: `Monto inválido: debe estar entre 1 y ${transaction.amountInCents} centavos.`,
      },
      400,
    );
  }

  const method = (transaction.paymentMethodType ?? "").toUpperCase();
  const reversible = REVERSIBLE_BY_API.has(method);
  const settlementKind = reversible ? "api" : "payout";
  const reason =
    typeof body.reason === "string" ? body.reason.slice(0, 300) : null;

  // Clave de idempotencia de esta solicitud de devolución.
  const idempotencyKey = crypto.randomUUID();

  const payout = body.payout ?? {};
  const asText = (value: unknown) =>
    typeof value === "string" && value.trim()
      ? value.trim().slice(0, 120)
      : null;

  const { error: insertError } = await db.from("refund_requests").insert({
    id: idempotencyKey,
    reference,
    transaction_id: transaction.id,
    payment_method_type: method || null,
    amount_in_cents: requestedAmount,
    reason,
    settlement_kind: settlementKind,
    status: reversible ? "REQUESTED" : "PENDING_MANUAL_PAYOUT",
    payout_bank: asText(payout.bank),
    payout_account_type: asText(payout.account_type),
    payout_account_holder: asText(payout.account_holder),
    payout_account_number: asText(payout.account_number),
    // No se guarda el token, solo que vino por esta vía.
    requested_by: "admin-token",
  });

  if (insertError) {
    // 23505 = choque con el índice único de devoluciones abiertas.
    if (insertError.code === "23505") {
      return json(
        {
          error: `El pedido ${reference} ya tiene una devolución en curso. Ciérrala antes de abrir otra.`,
        },
        409,
      );
    }
    console.error(
      "[wompi] no se pudo registrar la devolución:",
      insertError.message,
    );
    return json({ error: "No se pudo registrar la devolución." }, 500);
  }

  // ---- Riel irreversible: obligación de pago manual. ----------------
  if (!reversible) {
    console.log(
      `[wompi] devolución manual pendiente ${reference} (${method || "medio desconocido"})`,
    );

    return json(
      {
        refund_id: idempotencyKey,
        reference,
        payment_method_type: method || null,
        amount_in_cents: requestedAmount,
        status: "PENDING_MANUAL_PAYOUT",
        reversible_by_api: false,
        mensaje:
          `El pago se hizo por ${method || "un medio no identificado"}, que es irreversible: ` +
          "Wompi no puede devolverlo por API. Quedó registrada la obligación de pago en " +
          "`refund_requests`. Para cerrarla hay que transferir el dinero a la cuenta del " +
          "comprador desde la cuenta del negocio y luego marcar la fila como PAID_OUT.",
      },
      202,
    );
  }

  // ---- Tarjeta: sí se puede pedir la anulación a Wompi. -------------
  const result = await voidCardTransaction(transaction.id);

  const { error: updateError } = await db
    .from("refund_requests")
    .update({
      status: result.ok ? "API_SENT" : "API_FAILED",
      provider_response: result.detail.slice(0, 500),
      settled_at: result.ok ? new Date().toISOString() : null,
    })
    .eq("id", idempotencyKey);

  if (updateError) {
    console.error(
      "[wompi] la devolución se ejecutó pero no se pudo actualizar el registro:",
      updateError.message,
    );
  }

  if (!result.ok) {
    console.error(`[wompi] anulación fallida para ${reference}`);
    return json(
      {
        refund_id: idempotencyKey,
        reference,
        status: "API_FAILED",
        reversible_by_api: true,
        mensaje:
          "Wompi no aceptó la anulación. Queda registrada como API_FAILED; " +
          "revísala en el panel de Wompi antes de reintentar.",
      },
      result.retryable ? 502 : 409,
    );
  }

  console.log(`[wompi] anulación solicitada ${reference}`);

  return json(
    {
      refund_id: idempotencyKey,
      reference,
      payment_method_type: method,
      amount_in_cents: requestedAmount,
      status: "API_SENT",
      reversible_by_api: true,
      mensaje:
        "Se pidió la anulación a Wompi. El estado final llega por el webhook " +
        "como VOIDED; hasta entonces no se considera devuelto.",
    },
    200,
  );
}
