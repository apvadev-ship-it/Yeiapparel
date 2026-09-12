/**
 * Alta y baja del boletín.
 *
 * Qué cambió y por qué: antes el formulario del 15% insertaba en Supabase
 * DESDE EL NAVEGADOR con la clave anónima. Eso tenía dos problemas. Uno,
 * cualquiera podía escribir en la tabla de correos sin pasar por la web.
 * Dos, el cupón se guardaba pero nadie lo enviaba, mientras la interfaz
 * decía "te llegará en unos minutos". Ahora el alta ocurre en el
 * servidor, con la clave de servicio, y el correo sale de verdad.
 *
 * SECURITY_RULES Regla 11: se pide el correo y nada más. Ni nombre, ni
 * teléfono, ni fecha de nacimiento. En Colombia estos datos caen bajo la
 * Ley 1581 de 2012, y el mejor modo de custodiar un dato es no pedirlo.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { serviceClient } from "@/lib/supabase-server";
import { readEnv } from "@/lib/runtime-env";
import { sendEmail, emailConfigured } from "@/lib/email";
import { renderWelcomeEmail } from "@/lib/email-templates";

export const UNSUBSCRIBE_PATH = "/api/boletin/baja";

/** Alfabeto sin caracteres que se confunden al leerlos (O/0, I/1). */
const COUPON_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Días que vale el cupón desde que se genera. Contado desde el alta,
 * no desde que se abre el correo — así todo el mundo tiene la misma
 * ventana real, y no depende de cuándo revise su bandeja de entrada.
 */
const COUPON_EXPIRY_DAYS = 30;

/**
 * Dirección pública del sitio, para los enlaces de los correos.
 * En un correo no sirve una ruta relativa: tiene que ser absoluta.
 */
export function siteUrl(): string {
  return (readEnv("SITE_URL") ?? "http://localhost:8080").replace(/\/+$/, "");
}

/**
 * Código aleatorio.
 *
 * `crypto.getRandomValues`, no `Math.random`: un cupón adivinable es un
 * descuento que cualquiera puede regalarse. Es la misma razón por la que
 * las referencias de pedido usan `randomUUID` (Regla 3).
 */
function randomCode(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(
    bytes,
    (b) => COUPON_ALPHABET[b % COUPON_ALPHABET.length],
  ).join("");
}

function generateCoupon(): string {
  return `YEI15-${randomCode(8)}`;
}

/** Enlace de baja de un suscriptor. */
export function unsubscribeUrl(token: string): string {
  return `${siteUrl()}${UNSUBSCRIBE_PATH}?t=${encodeURIComponent(token)}`;
}

const subscribeSchema = z.object({
  // Tope de longitud: sin él, un campo de varios megas llegaría a la
  // base antes de que nada lo rechazara.
  email: z.string().trim().toLowerCase().min(3).max(150).email(),
});

export type SubscribeResult = {
  ok: boolean;
  /** `true` si el correo de bienvenida salió de verdad. */
  emailSent: boolean;
  /** Mensaje para enseñar en pantalla cuando algo no salió como debía. */
  notice?: string;
};

export const subscribeToNewsletter = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => subscribeSchema.parse(data))
  .handler(async ({ data }): Promise<SubscribeResult> => {
    const email = data.email;
    const db = serviceClient();

    if (!db) {
      // Sin base no se puede guardar. Se dice, en vez de fingir un alta
      // que se pierde: la persona creería estar suscrita y no lo estaría.
      console.error("[boletin] sin Supabase configurado; alta descartada");
      return {
        ok: false,
        emailSent: false,
        notice: "El registro no está disponible ahora mismo.",
      };
    }

    // ¿Ya estaba? Se reutiliza su cupón en vez de emitir uno nuevo, para
    // que quien se registre dos veces no acumule descuentos.
    const { data: existing } = await db
      .from("newsletter")
      .select(
        "coupon_code, coupon_expires_at, unsubscribe_token, welcome_status",
      )
      .eq("email", email)
      .maybeSingle();

    const couponCode = existing?.coupon_code ?? generateCoupon();
    const token = existing?.unsubscribe_token ?? randomCode(32);
    const expiresAt = existing?.coupon_expires_at
      ? new Date(existing.coupon_expires_at)
      : new Date(Date.now() + COUPON_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    if (!existing) {
      const { error } = await db.from("newsletter").insert({
        email,
        coupon_code: couponCode,
        coupon_expires_at: expiresAt.toISOString(),
        unsubscribe_token: token,
      });

      if (error) {
        // Nunca se registra el correo de la persona (Regla 11): solo el
        // motivo técnico del fallo.
        console.error(`[boletin] no se pudo dar de alta: ${error.message}`);
        return {
          ok: false,
          emailSent: false,
          notice: "No pudimos completar el registro. Inténtalo de nuevo.",
        };
      }
    } else if (existing.welcome_status === "sent") {
      // Ya se le escribió antes. Se responde bien, sin reenviar: un
      // segundo correo idéntico solo consigue que marquen spam.
      return { ok: true, emailSent: true };
    }

    if (!emailConfigured()) {
      // Se queda `pending`: el alta es válida y el correo se puede
      // reintentar cuando haya credenciales.
      return {
        ok: true,
        emailSent: false,
        notice:
          "Quedaste registrada. El envío de correos aún no está configurado, así que tu cupón todavía no sale por correo.",
      };
    }

    const link = unsubscribeUrl(token);
    const welcome = renderWelcomeEmail({
      couponCode,
      expiresAt,
      storeUrl: `${siteUrl()}/tienda`,
      unsubscribeUrl: link,
    });

    const sent = await sendEmail({
      to: email,
      subject: welcome.subject,
      html: welcome.html,
      text: welcome.text,
      unsubscribeUrl: link,
    });

    const status = sent.ok && sent.mode === "sent" ? "sent" : "failed";

    await db
      .from("newsletter")
      .update({
        welcome_status: sent.ok ? status : "failed",
        welcome_sent_at: status === "sent" ? new Date().toISOString() : null,
      })
      .eq("email", email);

    if (!sent.ok) {
      return {
        ok: true,
        emailSent: false,
        notice:
          "Quedaste registrada, pero el correo no pudo salir. Escríbenos y te pasamos el cupón.",
      };
    }

    return { ok: true, emailSent: sent.mode === "sent" };
  });

/**
 * Baja.
 *
 * Acepta GET (el enlace del pie) y POST (el botón nativo de Gmail, que
 * hace una petición de un solo clic contra `List-Unsubscribe`). Si solo
 * se aceptara GET, ese botón fallaría en silencio.
 *
 * No pide confirmación ni sesión: el token del enlace es la credencial.
 * Poner una pantalla intermedia hace que la gente marque spam.
 */
export async function handleUnsubscribe(request: Request): Promise<Response> {
  if (request.method !== "GET" && request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const token = new URL(request.url).searchParams.get("t") ?? "";
  if (!token) return htmlResponse("Enlace incompleto.", 400);

  const db = serviceClient();
  if (!db) return htmlResponse("Servicio no disponible.", 503);

  const { error } = await db
    .from("newsletter")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("unsubscribe_token", token);

  if (error) {
    console.error(`[boletin] fallo al dar de baja: ${error.message}`);
    return htmlResponse("No pudimos procesar la baja.", 500);
  }

  // Se responde igual exista o no el token: confirmar cuáles son válidos
  // permitiría comprobar a ciegas si una dirección está en la lista.
  return htmlResponse("Listo. No volverás a recibir nuestros correos.", 200);
}

/** Página mínima de respuesta, en la paleta de la marca. */
function htmlResponse(message: string, status: number): Response {
  const body = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Boletín YEI</title></head>
<body style="margin:0;background:#F7F3EE;font-family:Inter,Helvetica,Arial,sans-serif;">
  <div style="max-width:420px;margin:18vh auto;padding:0 24px;text-align:center;">
    <p style="font-family:Georgia,serif;font-size:30px;letter-spacing:9px;color:#351A17;margin:0 0 28px;">Y E I</p>
    <p style="font-size:15px;line-height:1.8;color:#5C4A44;margin:0 0 28px;">${message}</p>
    <a href="${siteUrl()}" style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#B74F3F;text-decoration:none;">Volver a la tienda</a>
  </div>
</body></html>`;

  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
