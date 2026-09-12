/**
 * Avisos automáticos de cuenta regresiva para la próxima colección.
 *
 * Corre junto al aviso de catálogo (`catalog-watch.ts`), en la misma
 * tarea programada diaria de `src/server.ts`. Tres hitos, decididos
 * por la marca: 10 días antes, 3 días antes, y el día del lanzamiento.
 * Cada uno se manda UNA sola vez — `launch_reminders_sent` lleva la
 * cuenta de cuáles ya salieron, para no repetir "faltan 10 días" todos
 * los días mientras falten 10 o menos.
 *
 * Nota sobre un caso raro pero posible: si la tarea programada estuvo
 * caída varios días y el primer chequeo ocurre, por ejemplo, a 1 día
 * del lanzamiento, los tres hitos (10, 3 y 0) se detectan como
 * pendientes a la vez y se mandan los tres correos ese mismo día. Es
 * mejor eso que perder el aviso por completo.
 */

import { serviceClient } from "@/lib/supabase-server";
import {
  getRemaining,
  LAUNCH_DATE,
  googleCalendarUrl,
} from "@/lib/next-collection";
import { ICS_PATH } from "@/lib/calendar-ics";
import { renderLaunchCountdownEmail } from "@/lib/email-templates";
import { sendEmail, emailConfigured } from "@/lib/email";
import { siteUrl, unsubscribeUrl } from "@/lib/newsletter";

/** Días antes del lanzamiento en los que se avisa. 0 = el día mismo. */
const MILESTONES = [10, 3, 0] as const;

const MAX_PER_RUN = 200;
const CONCURRENCY = 5;

export type LaunchReminderResult =
  { ran: false; reason: string } | { ran: true; milestonesSent: number[] };

function launchDateLabel(): string {
  return LAUNCH_DATE.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  });
}

function copyForMilestone(milestone: number): {
  headline: string;
  intro: string;
} {
  if (milestone === 0) {
    return {
      headline: "Hoy se abre la nueva colección",
      intro:
        "El día llegó. Entra antes que se agoten las piezas que más te gustan.",
    };
  }
  if (milestone <= 3) {
    return {
      headline: `Faltan ${milestone} días para la nueva colección`,
      intro:
        "Ya casi. Aquí tienes el conteo exacto, al momento de este correo.",
    };
  }
  return {
    headline: `Faltan ${milestone} días para la nueva colección`,
    intro:
      "Se acerca el lanzamiento. Aquí tienes el conteo exacto, al momento de este correo.",
  };
}

/**
 * Revisa si hoy toca mandar alguno de los tres avisos, y los manda.
 * Nunca lanza: un fallo de correo en un hito no impide revisar los
 * demás.
 */
export async function checkLaunchReminders(): Promise<LaunchReminderResult> {
  const db = serviceClient();
  if (!db) return { ran: false, reason: "Base de datos no configurada." };

  const remaining = getRemaining();
  // Días completos que faltan, redondeando hacia arriba: con 2 días y
  // 3 horas por delante, todavía "faltan 3 días" a efectos de qué
  // aviso mandar, no 2.
  const daysUntilLaunch = remaining.terminado
    ? 0
    : Math.ceil((LAUNCH_DATE.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

  const { data: sentRows, error } = await db
    .from("launch_reminders_sent")
    .select("milestone_days");

  if (error) {
    console.error(
      "[lanzamiento] no se pudo leer qué avisos ya salieron:",
      error.message,
    );
    return { ran: false, reason: error.message };
  }

  const alreadySent = new Set(
    (sentRows ?? []).map((row) => Number(row["milestone_days"])),
  );

  const due = MILESTONES.filter(
    (m) => daysUntilLaunch <= m && !alreadySent.has(m),
  );

  const milestonesSent: number[] = [];

  for (const milestone of due) {
    const { headline, intro } = copyForMilestone(milestone);
    const outcome = await sendLaunchReminder({ headline, intro, remaining });

    // Se marca como mandado incluso si el envío falló del todo: es la
    // misma decisión que en `catalog-watch.ts` — reintentar "faltan 10
    // días" cada día hasta que Resend vuelva sería peor que perder ese
    // aviso puntual.
    const { error: markError } = await db
      .from("launch_reminders_sent")
      .insert({ milestone_days: milestone });
    if (markError) {
      console.error(
        `[lanzamiento] no se pudo marcar el hito ${milestone} como enviado:`,
        markError.message,
      );
    }

    if (outcome.ok) {
      milestonesSent.push(milestone);
      console.log(
        `[lanzamiento] aviso de ${milestone} días · enviados=${outcome.sent} fallidos=${outcome.failed}`,
      );
    } else {
      console.error(
        `[lanzamiento] el aviso de ${milestone} días no se pudo mandar:`,
        outcome.reason,
      );
    }
  }

  return { ran: true, milestonesSent };
}

async function sendLaunchReminder(input: {
  headline: string;
  intro: string;
  remaining: { dias: number; horas: number; minutos: number; segundos: number };
}): Promise<
  { ok: true; sent: number; failed: number } | { ok: false; reason: string }
> {
  const db = serviceClient();
  if (!db) return { ok: false, reason: "Base de datos no configurada." };
  if (!emailConfigured()) return { ok: false, reason: "Falta RESEND_API_KEY." };

  const { data: subscribers, error: listError } = await db
    .from("newsletter")
    .select("email, unsubscribe_token")
    .is("unsubscribed_at", null)
    .limit(MAX_PER_RUN);

  if (listError) return { ok: false, reason: "No se pudo leer la lista." };

  const recipients = (subscribers ?? []) as {
    email: string;
    unsubscribe_token: string;
  }[];
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += CONCURRENCY) {
    const batch = recipients.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (person) => {
        const link = unsubscribeUrl(person.unsubscribe_token);
        const email = renderLaunchCountdownEmail({
          headline: input.headline,
          intro: input.intro,
          remaining: input.remaining,
          launchDateLabel: launchDateLabel(),
          ctaUrl: `${siteUrl()}/nueva-coleccion`,
          googleCalendarUrl: googleCalendarUrl(siteUrl()),
          icsUrl: `${siteUrl()}${ICS_PATH}`,
          unsubscribeUrl: link,
        });
        return sendEmail({
          to: person.email,
          subject: input.headline,
          html: email.html,
          text: email.text,
          unsubscribeUrl: link,
        });
      }),
    );

    for (const result of results) {
      if (result.ok) sent++;
      else failed++;
    }
  }

  return { ok: true, sent, failed };
}
