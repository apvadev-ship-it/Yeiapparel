/**
 * "Agregar al calendario", como archivo .ics — no como enlace de
 * Google Calendar.
 *
 * Por qué el cambio: el enlace de "quick add" de Google
 * (`calendar.google.com/calendar/render?...`) solo funciona si quien
 * le da clic YA tiene una sesión de Google activa en la ventana que
 * abre ese enlace. Eso falla más de lo que parece: la app de Gmail en
 * el celular (y varias apps de correo más) abren los enlaces en una
 * ventana aislada que no comparte la sesión del navegador del
 * teléfono, así que Google la trata como visita anónima y rebota a su
 * página de marketing en vez de mostrar el evento. Se confirmó
 * probándolo.
 *
 * Un archivo .ics no tiene ese problema: es un formato de archivo, no
 * depende de ninguna sesión. El sistema operativo lo entrega a
 * cualquier app de calendario que la persona tenga — Google Calendar,
 * Apple Calendar, Outlook, la que sea — sin que el remitente tenga
 * que saber cuál.
 */

export const ICS_PATH = "/api/calendario.ics";

/** "20260925T170000Z" — el formato de fecha que pide el estándar iCalendar. */
function toIcsStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/**
 * Escapa texto para un campo de .ics (RFC 5545): las comas, puntos y
 * coma y saltos de línea tienen significado especial en el formato.
 */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");
}

/** Arma el archivo .ics del lanzamiento, listo para servir. */
export function renderLaunchIcs(params: {
  launchDate: Date;
  siteUrl: string;
}): string {
  const { launchDate, siteUrl } = params;
  const start = launchDate;
  const end = new Date(launchDate.getTime() + 2 * 60 * 60 * 1000);
  const now = toIcsStamp(new Date());

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//YEI Apparel//Nueva Coleccion//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    // Referencia fija: siempre el mismo evento para el mismo
    // lanzamiento, aunque la persona lo agregue más de una vez.
    "UID:yei-nueva-coleccion-2026-09-25@yeiapparel.co",
    `DTSTAMP:${now}`,
    `DTSTART:${toIcsStamp(start)}`,
    `DTEND:${toIcsStamp(end)}`,
    `SUMMARY:${escapeIcsText("Nueva colección YEI Apparel")}`,
    `DESCRIPTION:${escapeIcsText(`La nueva colección de YEI Apparel abre hoy. ${siteUrl}/nueva-coleccion`)}`,
    `LOCATION:${escapeIcsText(siteUrl)}`,
    `URL:${siteUrl}/nueva-coleccion`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  // El estándar pide fin de línea CRLF, no solo "\n".
  return lines.join("\r\n") + "\r\n";
}
