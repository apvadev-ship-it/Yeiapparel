/**
 * Número de WhatsApp Business de YEI, en formato internacional sin "+"
 * ni espacios (código de país 57 = Colombia).
 *
 * Antes se usaba el enlace corto "wa.me/message/<id>" generado desde la
 * app de WhatsApp Business. Se cambió por dos razones, encontradas
 * probando el formulario de contacto: ese enlace había caducado ("El
 * enlace ya no es válido"), y aunque no hubiera caducado, ese formato
 * no admite el parámetro `?text=` para prellenar el mensaje — WhatsApp
 * lo descarta y pone los suyos. Un enlace `wa.me/<número>` normal sí
 * hace las dos cosas: no caduca y admite `?text=`.
 */
const WHATSAPP_NUMBER = "573105785561";

/** Enlace de WhatsApp del negocio, sin mensaje. */
export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;

/** El enlace de WhatsApp con un mensaje ya escrito, listo para enviar. */
export function whatsappUrlWithMessage(message: string): string {
  return `${WHATSAPP_LINK}?text=${encodeURIComponent(message)}`;
}
