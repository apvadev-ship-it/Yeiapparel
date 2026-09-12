/**
 * Envío de mensajes por el bot de Telegram del negocio.
 *
 * Se extrajo de `contact-notify.ts` (que fue el primer aviso en usar
 * Telegram) para que `order-notify.ts` y `weekly-report.ts` puedan
 * mandar por el mismo canal sin duplicar la llamada a la API.
 *
 * Cómo se crea el bot y de dónde salen TELEGRAM_BOT_TOKEN y
 * TELEGRAM_CHAT_ID: ver el comentario al inicio de `contact-notify.ts`.
 *
 * SECURITY_RULES Regla 3: el token del bot es un secreto de servidor.
 */

import { readEnv } from "@/lib/runtime-env";

/** Tope real de Telegram para el texto de un mensaje. */
const TELEGRAM_MAX_CHARS = 4096;

/** `true` si hay credenciales del bot configuradas. */
export function telegramConfigured(): boolean {
  return Boolean(readEnv("TELEGRAM_BOT_TOKEN") && readEnv("TELEGRAM_CHAT_ID"));
}

/**
 * Manda un mensaje de texto plano por el bot. `false` sin lanzar si no
 * hay credenciales, si Telegram responde con error, o si falla la red
 * — quien llama decide qué hacer con ese `false` (normalmente nada:
 * estos avisos son mejor esfuerzo).
 *
 * Si el texto pasa el tope de Telegram, se recorta y se anota, en vez
 * de dejar que la API lo rechace entero.
 */
export async function sendTelegramMessage(text: string): Promise<boolean> {
  const token = readEnv("TELEGRAM_BOT_TOKEN");
  const chatId = readEnv("TELEGRAM_CHAT_ID");
  if (!token || !chatId) return false;

  const body =
    text.length > TELEGRAM_MAX_CHARS
      ? `${text.slice(0, TELEGRAM_MAX_CHARS - 20)}\n… (recortado)`
      : text;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: body }),
        // Sin tope, un Telegram lento colgaría la petición del Worker
        // hasta el límite de tiempo de Cloudflare. 5 s es de sobra.
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(
        `[telegram] Telegram respondió ${response.status}: ${detail.slice(0, 300)}`,
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("[telegram] fallo de red:", error);
    return false;
  }
}
