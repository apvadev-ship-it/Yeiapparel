/**
 * Envío de correo, con Resend.
 *
 * Por qué Resend y no SMTP: en Cloudflare Workers no hay sockets TCP, así
 * que nodemailer y cualquier cosa que hable SMTP no arrancan. Resend
 * tiene API HTTP, que es lo único que un Worker puede usar.
 *
 * Se usa `fetch` directo en vez del SDK de Resend: la llamada es un POST
 * con JSON, y una dependencia menos es una superficie menos que auditar.
 *
 * SECURITY_RULES Regla 3: RESEND_API_KEY es secreta y solo se lee en el
 * servidor. Nunca lleva prefijo VITE_.
 */

import { readEnv } from "@/lib/runtime-env";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Remitente del sandbox de Resend. Funciona SIN dominio verificado, pero
 * con un límite que hay que entender: Resend solo entrega a la dirección
 * de la cuenta. No es una restricción del código, es del proveedor.
 *
 * Para escribir a clientes reales hay que verificar el dominio en Resend
 * (registros SPF y DKIM) y poner EMAIL_FROM a algo como
 * "YEI Apparel <hola@tudominio.com>".
 */
const SANDBOX_FROM = "YEI Apparel <onboarding@resend.dev>";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  /** Alternativa en texto plano. Sin ella, varios filtros puntúan peor. */
  text: string;
  /**
   * Enlace de baja. Va como cabecera `List-Unsubscribe`, que es lo que
   * leen Gmail y Outlook para pintar el botón nativo de "cancelar
   * suscripción". Sin esto, la gente marca como spam en vez de darse de
   * baja, y eso sí quema la reputación del dominio.
   */
  unsubscribeUrl?: string;
};

export type EmailResult =
  | { ok: true; id: string; mode: "sent" }
  /** No hay API key: no se intenta enviar y se dice. */
  | { ok: true; id: null; mode: "dry_run" }
  | { ok: false; error: string };

/** `true` si hay credenciales para enviar de verdad. */
export function emailConfigured(): boolean {
  return Boolean(readEnv("RESEND_API_KEY"));
}

/** `true` si se está usando el remitente de pruebas de Resend. */
export function emailInSandboxMode(): boolean {
  return !readEnv("EMAIL_FROM");
}

/**
 * Envía un correo.
 *
 * Sin `RESEND_API_KEY` devuelve `dry_run` en vez de fallar: así el
 * formulario del boletín sigue funcionando en local y en las pruebas sin
 * obligar a tener credenciales, y quien llame puede distinguir "no se
 * envió porque no hay llaves" de "no se envió porque falló".
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const apiKey = readEnv("RESEND_API_KEY");
  if (!apiKey) {
    console.log(
      `[email] sin RESEND_API_KEY; simulado asunto="${message.subject}"`,
    );
    return { ok: true, id: null, mode: "dry_run" };
  }

  const from = readEnv("EMAIL_FROM") ?? SANDBOX_FROM;

  const headers: Record<string, string> = {
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
  };

  const payload: {
    from: string;
    to: string[];
    subject: string;
    html: string;
    text: string;
    headers?: Record<string, string>;
  } = {
    from,
    to: [message.to],
    subject: message.subject,
    html: message.html,
    text: message.text,
  };

  if (message.unsubscribeUrl) {
    payload.headers = {
      "List-Unsubscribe": `<${message.unsubscribeUrl}>`,
      // Declara que basta un POST para dar de baja, sin confirmación.
      // Gmail lo exige para mostrar su botón nativo.
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      // Sin tope, un Resend lento colgaría la petición del Worker hasta
      // su propio límite de tiempo. 5 s es de sobra para una API HTTP.
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      // El cuerpo de error de Resend trae el motivo (dominio sin
      // verificar, destinatario no permitido en sandbox, etc.). Se
      // registra el motivo, nunca el contenido del correo.
      const detail = await response.text().catch(() => "");
      const reason = `${response.status} ${detail.slice(0, 300)}`;
      console.error(`[email] fallo al enviar: ${reason}`);
      return { ok: false, error: reason };
    }

    const data = (await response.json()) as { id?: string };
    return { ok: true, id: data.id ?? "", mode: "sent" };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "error desconocido";
    console.error(`[email] excepción al enviar: ${reason}`);
    return { ok: false, error: reason };
  }
}
