/**
 * Fecha del próximo lanzamiento, compartida entre la página del
 * cronómetro (`routes/nueva-coleccion.tsx`) y los avisos automáticos
 * por correo (`launch-reminders.ts`). Una sola fecha, un solo lugar —
 * si algún día cambia, cambia aquí y los dos se actualizan solos.
 */
export const LAUNCH_DATE = new Date("2026-09-25T12:00:00-05:00");

export type Remaining = {
  dias: number;
  horas: number;
  minutos: number;
  segundos: number;
  terminado: boolean;
};

/** Cuánto falta para `LAUNCH_DATE`, calculado en el momento en que se llama. */
/** "20260925T170000Z" — formato de fecha que pide la URL de Google Calendar. */
function toGoogleStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/**
 * Enlace de "agregar a Google Calendar" con el evento ya lleno. Abre
 * directo la pantalla de crear evento — sin pasos, sin que la persona
 * tenga que descargar ni abrir nada — siempre que tenga sesión de
 * Google activa en el navegador donde abre el enlace, que es el caso
 * normal cuando el correo se abre desde el navegador del celular o del
 * computador. Se ofrece junto al archivo .ics (`calendar-ics.ts`) como
 * alternativa para quien use Apple Calendar, Outlook, o abra el
 * correo en una app que aísla la sesión de Google.
 */
export function googleCalendarUrl(siteUrl: string): string {
  const start = LAUNCH_DATE;
  const end = new Date(LAUNCH_DATE.getTime() + 2 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: "Nueva colección YEI Apparel",
    dates: `${toGoogleStamp(start)}/${toGoogleStamp(end)}`,
    details: `La nueva colección de YEI Apparel abre hoy. ${siteUrl}/nueva-coleccion`,
    location: siteUrl,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function getRemaining(now: Date = new Date()): Remaining {
  const diff = LAUNCH_DATE.getTime() - now.getTime();

  if (diff <= 0) {
    return { dias: 0, horas: 0, minutos: 0, segundos: 0, terminado: true };
  }

  const segundosTotales = Math.floor(diff / 1000);

  return {
    dias: Math.floor(segundosTotales / 86400),
    horas: Math.floor((segundosTotales % 86400) / 3600),
    minutos: Math.floor((segundosTotales % 3600) / 60),
    segundos: segundosTotales % 60,
    terminado: false,
  };
}
