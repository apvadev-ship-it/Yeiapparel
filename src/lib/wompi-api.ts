import { readEnv } from "@/lib/runtime-env";

/**
 * Llamadas a la API de Wompi desde el servidor.
 *
 * Documentación: https://docs.wompi.co/docs/colombia/ (referencia de API)
 *
 * Aquí vive la pieza más importante de toda la integración: volver a
 * consultarle a Wompi el estado real de una transacción.
 *
 * SECURITY_RULES Regla 1: el cuerpo de un evento no manda. Aunque la
 * firma cuadre, ese JSON es una copia de algo que pasó hace rato y puede
 * estar desactualizado (o reenviado). El estado que vale es el que
 * devuelve esta consulta, hecha por nosotros contra el dominio de Wompi.
 *
 * SECURITY_RULES Regla 3: la llave privada solo se usa aquí, en el
 * servidor, y solo para anular cobros. Nunca sale al navegador.
 */

/** Tiempo máximo de espera; el Worker no puede quedarse colgado. */
const REQUEST_TIMEOUT_MS = 10_000;

const SANDBOX_BASE = "https://sandbox.wompi.co/v1";
const PRODUCTION_BASE = "https://production.wompi.co/v1";

/**
 * Sandbox o producción, según la llave pública configurada.
 *
 * Las llaves de Wompi llevan el entorno en el prefijo (`pub_test_` /
 * `pub_prod_`). Derivarlo de ahí evita el error clásico de tener llaves
 * de prueba apuntando al dominio de producción, que falla con un 401
 * difícil de leer.
 */
export function wompiApiBase(): string {
  const publicKey = readEnv("WOMPI_PUBLIC_KEY") ?? "";
  return publicKey.startsWith("pub_test_") ? SANDBOX_BASE : PRODUCTION_BASE;
}

/** Los campos de una transacción que este proyecto usa. */
export type WompiTransaction = {
  id: string;
  status: string;
  reference: string;
  amountInCents: number;
  currency: string;
  paymentMethodType: string | null;
  statusMessage: string | null;
};

export type FetchTransactionResult =
  | { ok: true; transaction: WompiTransaction }
  /** Wompi respondió que esa transacción no existe. No sirve reintentar. */
  | { ok: false; reason: "not_found" }
  /** Fallo de red, timeout o 5xx. Sí conviene reintentar. */
  | { ok: false; reason: "unavailable" };

function parseTransaction(raw: unknown): WompiTransaction | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;

  const id = data["id"];
  const status = data["status"];
  if (typeof id !== "string" || typeof status !== "string") return null;

  return {
    id,
    status,
    reference: String(data["reference"] ?? ""),
    amountInCents: Number(data["amount_in_cents"] ?? 0),
    currency: String(data["currency"] ?? "COP"),
    paymentMethodType:
      typeof data["payment_method_type"] === "string"
        ? data["payment_method_type"]
        : null,
    statusMessage:
      typeof data["status_message"] === "string"
        ? data["status_message"]
        : null,
  };
}

/**
 * Consulta una transacción por su id.
 *
 * Este endpoint es público: se identifica por el id, que es un UUID
 * imposible de adivinar, y por eso no lleva cabecera de autorización.
 */
export async function fetchTransaction(
  transactionId: string,
): Promise<FetchTransactionResult> {
  const url = `${wompiApiBase()}/transactions/${encodeURIComponent(transactionId)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    // Red caída o timeout. No se sabe nada del pago: se pide reintento.
    console.error("[wompi] no se pudo consultar la transacción (red)");
    return { ok: false, reason: "unavailable" };
  }

  if (response.status === 404) return { ok: false, reason: "not_found" };

  if (!response.ok) {
    console.error(
      `[wompi] consulta de transacción devolvió ${response.status}`,
    );
    return { ok: false, reason: "unavailable" };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, reason: "unavailable" };
  }

  const payload = body as { data?: unknown };
  const transaction = parseTransaction(payload.data);
  if (!transaction) {
    console.error(
      "[wompi] la respuesta de la transacción no tiene la forma esperada",
    );
    return { ok: false, reason: "unavailable" };
  }

  return { ok: true, transaction };
}

export type VoidResult =
  | { ok: true; detail: string }
  | { ok: false; detail: string; retryable: boolean };

/**
 * Anula (void) una transacción con tarjeta.
 *
 * Solo aplica a `payment_method_type = "CARD"`. El resto de medios que se
 * cobran en Colombia son irreversibles y se resuelven por transferencia
 * manual; eso se decide en `src/lib/wompi-refunds.ts`, no aquí.
 *
 * Nota honesta sobre esta ruta: la anulación de tarjeta se hace contra
 * `POST /transactions/{id}/void` con la llave privada. Wompi también
 * ofrece devoluciones parciales fuera de la ventana de anulación, que se
 * tramitan por soporte o desde el panel. La URL está centralizada en esta
 * constante justamente para poder cambiarla en un solo sitio si tu
 * cuenta usa otro endpoint. Antes de operar en vivo, confirma la ruta
 * con la documentación vigente de Wompi y haz una prueba en sandbox.
 */
function voidPath(transactionId: string): string {
  return `${wompiApiBase()}/transactions/${encodeURIComponent(transactionId)}/void`;
}

export async function voidCardTransaction(
  transactionId: string,
): Promise<VoidResult> {
  const privateKey = readEnv("WOMPI_PRIVATE_KEY");
  if (!privateKey) {
    return {
      ok: false,
      detail: "Falta WOMPI_PRIVATE_KEY: no se puede anular por API.",
      retryable: false,
    };
  }

  let response: Response;
  try {
    response = await fetch(voidPath(transactionId), {
      method: "POST",
      headers: {
        authorization: `Bearer ${privateKey}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return {
      ok: false,
      detail: "Wompi no respondió a tiempo.",
      retryable: true,
    };
  }

  // Solo se guarda un extracto: la respuesta completa puede traer datos
  // del comprador y no hace falta almacenarla entera.
  const text = (await response.text()).slice(0, 500);

  if (response.ok) {
    return { ok: true, detail: `HTTP ${response.status}` };
  }

  return {
    ok: false,
    detail: `HTTP ${response.status}: ${text}`,
    retryable: response.status >= 500,
  };
}
