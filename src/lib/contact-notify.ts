/**
 * Aviso automático de un mensaje de contacto nuevo, por Telegram y por
 * correo. Los dos son mejor esfuerzo: si ninguno está configurado, o si
 * alguno falla, el mensaje igual queda guardado en `contact_messages`
 * (ver `src/lib/contact.ts`) — esto solo decide si además llega un
 * aviso al momento.
 *
 * Por qué Telegram y no WhatsApp: automatizar WhatsApp de verdad
 * (que el mensaje llegue sin que nadie confirme "Enviar") exige la
 * WhatsApp Business Cloud API, y eso obliga a elegir entre usar el
 * número en el celular o en la API — no las dos a la vez, salvo que se
 * contrate un proveedor externo (BSP) para el modo "Coexistencia". Un
 * bot de Telegram no tiene ese problema: se crea en un minuto, es
 * gratis, y no toca el WhatsApp normal del negocio para nada.
 *
 * Cómo se crea el bot de Telegram (no se puede generar desde código,
 * es una cuenta de Telegram):
 *   1. Abre una conversación con @BotFather en Telegram.
 *   2. Mándale /newbot, ponle un nombre y un usuario (debe terminar en
 *      "bot", por ejemplo yei_apparel_bot).
 *   3. BotFather responde con un token — eso es TELEGRAM_BOT_TOKEN.
 *   4. Abre una conversación con TU bot nuevo y mándale cualquier
 *      mensaje (por ejemplo "hola"), para que sepa a quién contestar.
 *   5. Visita
 *      https://api.telegram.org/bot<TU_TOKEN>/getUpdates
 *      en el navegador: ahí aparece tu "chat":{"id": ...} — ese número
 *      es TELEGRAM_CHAT_ID.
 *
 * SECURITY_RULES Regla 3: el token del bot es un secreto de servidor.
 * Quien lo tenga puede mandar mensajes como el bot.
 */

import { readEnv } from "@/lib/runtime-env";
import { sendEmail, emailConfigured } from "@/lib/email";
import { sendTelegramMessage } from "@/lib/telegram";

export type ContactNotifyInput = {
  name: string;
  contactMethod: "email" | "telefono";
  contactValue: string;
  topicLabel: string;
  subtopic: string;
  message: string;
};

function buildText(data: ContactNotifyInput): string {
  const contactLabel = data.contactMethod === "email" ? "correo" : "teléfono";
  return [
    `Nuevo mensaje de contacto — ${data.name}`,
    `Tema: ${data.topicLabel} — ${data.subtopic}`,
    `Contactar por ${contactLabel}: ${data.contactValue}`,
    "",
    `Mensaje: ${data.message}`,
  ].join("\n");
}

async function notifyEmail(text: string, subject: string): Promise<boolean> {
  const to = readEnv("NOTIFY_EMAIL");
  if (!to || !emailConfigured()) return false;

  const html = `<pre style="font-family:inherit;white-space:pre-wrap">${text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")}</pre>`;

  const result = await sendEmail({ to, subject, html, text });
  return result.ok && result.mode === "sent";
}

/**
 * Manda el aviso por los dos canales configurados, en paralelo. No
 * lanza nunca — cada canal se resuelve a `true`/`false` por su cuenta.
 */
export async function notifyNewContactMessage(
  data: ContactNotifyInput,
): Promise<{ telegram: boolean; email: boolean }> {
  const text = buildText(data);
  const [telegram, email] = await Promise.all([
    sendTelegramMessage(text),
    notifyEmail(text, "Nuevo mensaje de contacto — YEI"),
  ]);
  return { telegram, email };
}
