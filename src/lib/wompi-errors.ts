/**
 * Traducción de los resultados de Wompi a frases que el comprador
 * entiende.
 *
 * SECURITY_RULES Regla 5: al comprador se le dice qué pasó y qué puede
 * hacer, sin filtrar detalles internos (códigos del procesador, ids de
 * transacción, respuestas crudas del banco). Eso queda en los registros
 * del servidor, no en pantalla.
 *
 * Aviso honesto: Wompi no publica un catálogo cerrado de códigos de
 * rechazo. Lo que llega en `status_message` es texto del banco o de la
 * franquicia, y cambia entre adquirentes. Por eso este mapa reconoce los
 * casos frecuentes por palabra clave y, cuando no reconoce nada, cae en
 * un mensaje genérico correcto en vez de inventar una causa.
 */

export type OutcomeTone = "ok" | "pendiente" | "rechazo" | "error";

export type WompiOutcome = {
  title: string;
  message: string;
  tone: OutcomeTone;
  /** `true` si tiene sentido que el comprador vuelva a intentar. */
  retryable: boolean;
};

/** Causas frecuentes, reconocidas por palabra clave en el mensaje. */
const DECLINE_HINTS: { match: RegExp; message: string }[] = [
  {
    match: /insufficient|fondos|saldo/i,
    message:
      "El banco reportó fondos insuficientes. Revisa el saldo o usa otro medio de pago.",
  },
  {
    match: /expired|vencid|caducad/i,
    message: "La tarjeta está vencida. Intenta con otra.",
  },
  {
    match: /invalid.*card|card.*invalid|tarjeta.*inv[aá]lid|invalid.*number/i,
    message:
      "Los datos de la tarjeta no son correctos. Revísalos e inténtalo otra vez.",
  },
  {
    match: /restricted|restringid|blocked|bloquead/i,
    message:
      "El banco tiene restringida esta tarjeta para compras por internet. Llámalos o usa otro medio.",
  },
  {
    match: /stolen|lost|robad|perdid/i,
    message:
      "El banco no autorizó el cobro con esa tarjeta. Comunícate con tu banco.",
  },
  {
    match: /limit|excede|exceed/i,
    message:
      "Se superó el cupo autorizado para esta compra. Prueba con otro medio de pago.",
  },
  {
    match: /3ds|authenticat|autenticaci/i,
    message:
      "No se completó la verificación con el banco. Vuelve a intentarlo y termina el paso de seguridad.",
  },
  {
    match: /fraud|antifraud|antifraude|risk/i,
    message:
      "El sistema antifraude del banco no dejó pasar el cobro. Intenta con otro medio de pago.",
  },
  {
    match: /cancel/i,
    message:
      "El pago se canceló antes de terminar. Puedes volver a intentarlo.",
  },
  {
    match: /timeout|tiempo|expir/i,
    message:
      "El pago tardó demasiado y se cerró la sesión con el banco. Inténtalo de nuevo.",
  },
  {
    match: /do not honor|denied|no autoriz|rechaz/i,
    message:
      "El banco no autorizó el cobro. Comunícate con ellos o usa otro medio de pago.",
  },
];

function hintFor(statusMessage: string | null | undefined): string | null {
  if (!statusMessage) return null;
  for (const hint of DECLINE_HINTS) {
    if (hint.match.test(statusMessage)) return hint.message;
  }
  return null;
}

/**
 * Convierte el estado de una transacción de Wompi en algo mostrable.
 *
 * Estados posibles: APPROVED, DECLINED, VOIDED, ERROR, PENDING.
 */
export function describeWompiOutcome(
  status: string,
  statusMessage?: string | null,
): WompiOutcome {
  switch (status.toUpperCase()) {
    case "APPROVED":
      return {
        title: "Pago aprobado",
        message:
          "Recibimos tu pago. Te enviamos la confirmación al correo con los datos del pedido.",
        tone: "ok",
        retryable: false,
      };

    case "PENDING":
      return {
        title: "Pago en proceso",
        message:
          "Tu pago está en proceso. Con PSE, Nequi o Efecty la confirmación puede tardar unos minutos; te avisamos por correo apenas se confirme. No vuelvas a pagar.",
        tone: "pendiente",
        retryable: false,
      };

    case "DECLINED":
      return {
        title: "Pago rechazado",
        message:
          hintFor(statusMessage) ??
          "El banco rechazó el cobro. Puedes intentar con otro medio de pago o comunicarte con tu banco.",
        tone: "rechazo",
        retryable: true,
      };

    case "VOIDED":
      return {
        title: "Pago anulado",
        message:
          "El cobro se anuló y no se hizo ningún cargo. Si fue un error, puedes volver a intentarlo.",
        tone: "rechazo",
        retryable: true,
      };

    case "ERROR":
      return {
        title: "El pago no se pudo procesar",
        message:
          hintFor(statusMessage) ??
          "Hubo un problema al procesar el pago y no se hizo ningún cargo. Vuelve a intentarlo en unos minutos.",
        tone: "error",
        retryable: true,
      };

    default:
      return {
        title: "Estado desconocido",
        message:
          "No pudimos confirmar el estado del pago. Escríbenos por WhatsApp con el número de tu pedido y lo revisamos.",
        tone: "error",
        retryable: false,
      };
  }
}

/** Cuando faltan credenciales de Wompi: no es culpa del comprador. */
export const CHECKOUT_NOT_CONFIGURED_MESSAGE =
  "La pasarela de pago todavía no está configurada. Escríbenos por WhatsApp y cerramos tu pedido a mano.";

/** Falla de red o excepción antes de llegar a Wompi. */
export const CHECKOUT_FAILED_MESSAGE =
  "No pudimos iniciar el pago. Vuelve a intentarlo en un momento.";

/** El comprador cerró el widget sin pagar. */
export const CHECKOUT_CLOSED_MESSAGE =
  "Cerraste la ventana de pago antes de terminar. Tu pedido sigue aquí cuando quieras retomarlo.";

/**
 * Mensaje para el resultado que devuelve el widget en el navegador.
 *
 * Se muestra, pero NO se toma como verdad: el pedido solo se marca como
 * pagado cuando llega el evento firmado al webhook y el servidor
 * re-consulta la transacción. El navegador es información, no prueba.
 */
export function describeWidgetResult(
  transaction: { status?: string; status_message?: string | null } | null,
): WompiOutcome {
  if (!transaction || !transaction.status) {
    return {
      title: "Pago sin terminar",
      message: CHECKOUT_CLOSED_MESSAGE,
      tone: "pendiente",
      retryable: true,
    };
  }
  return describeWompiOutcome(
    transaction.status,
    transaction.status_message ?? null,
  );
}
