/**
 * Campañas del boletín: el agente escribe y el correo sale.
 *
 * El envío es AUTOMÁTICO por decisión del dueño de la tienda: nadie lee
 * el texto antes de que llegue a los clientes. Eso mueve toda la
 * responsabilidad a las comprobaciones previas, que están en
 * `brand-agent.ts` (anclaje al catálogo y validación del resultado). Una
 * campaña que no pase esas comprobaciones no se envía: se guarda como
 * `failed` con el motivo, y no se escribe a nadie.
 *
 * Antes de disparar de verdad conviene `?dryRun=1`, que ejecuta el
 * agente y devuelve el correo ya montado sin enviarlo.
 *
 * SECURITY_RULES Regla 10: el token se compara en tiempo constante.
 * SECURITY_RULES Regla 11: no se registra ninguna dirección de correo.
 */

import { z } from "zod";
import { serviceClient } from "@/lib/supabase-server";
import { readEnv } from "@/lib/runtime-env";
import { constantTimeEqual, bearerToken } from "@/lib/constant-time";
import { generateBrandUpdate, brandAgentConfigured } from "@/lib/brand-agent";
import { renderCampaignEmail } from "@/lib/email-templates";
import { sendEmail, emailConfigured } from "@/lib/email";
import { siteUrl, unsubscribeUrl } from "@/lib/newsletter";

export const CAMPAIGN_PATH = "/api/boletin/campana";

/**
 * Tope de destinatarios por ejecución.
 *
 * Un Worker tiene tiempo de CPU acotado por petición, y cada envío es una
 * llamada HTTP. Con una lista grande, intentar mandarlos todos en una
 * sola petición se corta a la mitad y deja la campaña sin saber a quién
 * alcanzó. Con este tope se envía por tandas y el resultado dice cuántos
 * quedaron pendientes.
 */
const MAX_PER_RUN = 200;

/** Envíos simultáneos. Suficiente para no ir de uno en uno, sin abusar. */
const CONCURRENCY = 5;

const bodySchema = z.object({
  brief: z.string().trim().max(300).optional(),
});

type Subscriber = { email: string; unsubscribe_token: string };

export async function handleCampaign(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: "Method Not Allowed" }, 405);
  }

  // Sin token configurado el endpoint queda apagado. Es deliberado: un
  // endpoint que escribe a toda la lista de clientes no puede quedar
  // abierto por olvidar poner una variable.
  const adminToken = readEnv("NEWSLETTER_ADMIN_TOKEN");
  if (!adminToken) {
    return json(
      {
        error:
          "El endpoint de campañas está apagado. Configura NEWSLETTER_ADMIN_TOKEN para habilitarlo.",
      },
      503,
    );
  }

  if (!constantTimeEqual(bearerToken(request), adminToken)) {
    return json({ error: "No autorizado." }, 401);
  }

  if (!brandAgentConfigured()) {
    return json({ error: "Falta ANTHROPIC_API_KEY." }, 503);
  }

  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";

  let brief: string | undefined;
  try {
    const raw = await request.text();
    brief = raw ? bodySchema.parse(JSON.parse(raw)).brief : undefined;
  } catch {
    return json({ error: "Cuerpo inválido." }, 400);
  }

  // 1. El agente escribe y el resultado se valida contra el catálogo.
  const generated = await generateBrandUpdate(brief);
  if (!generated.ok) {
    console.error(`[boletin] el agente no produjo campaña: ${generated.error}`);
    return json({ error: generated.error }, 422);
  }

  const update = generated.update;
  const ctaAbsolute = `${siteUrl()}${update.body.ctaUrl}`;

  // 2. En prueba se devuelve el correo montado y no se envía nada.
  if (dryRun) {
    const preview = renderCampaignEmail({
      preheader: update.preheader,
      body: { ...update.body, ctaUrl: ctaAbsolute },
      unsubscribeUrl: `${siteUrl()}/api/boletin/baja?t=EJEMPLO`,
    });
    return json({
      dryRun: true,
      model: update.model,
      subject: update.subject,
      preheader: update.preheader,
      body: update.body,
      html: preview.html,
      text: preview.text,
    });
  }

  const db = serviceClient();
  if (!db) return json({ error: "Base de datos no configurada." }, 503);
  if (!emailConfigured()) {
    return json({ error: "Falta RESEND_API_KEY." }, 503);
  }

  // 3. Se guarda la campaña ANTES de enviar. Con envío automático, esta
  //    fila es el único registro de qué se dijo y con qué modelo.
  const { data: campaign, error: campaignError } = await db
    .from("newsletter_campaigns")
    .insert({
      subject: update.subject,
      preheader: update.preheader,
      body: update.body,
      model: update.model,
      brief: brief ?? null,
      status: "sending",
    })
    .select("id")
    .single();

  if (campaignError || !campaign) {
    console.error(
      `[boletin] no se pudo registrar la campaña: ${campaignError?.message}`,
    );
    return json({ error: "No se pudo registrar la campaña." }, 500);
  }

  // 4. Destinatarios: solo quien no se ha dado de baja.
  const { data: subscribers, error: listError } = await db
    .from("newsletter")
    .select("email, unsubscribe_token")
    .is("unsubscribed_at", null)
    .limit(MAX_PER_RUN);

  if (listError) {
    await db
      .from("newsletter_campaigns")
      .update({ status: "failed", error: listError.message })
      .eq("id", campaign.id);
    return json({ error: "No se pudo leer la lista." }, 500);
  }

  const recipients = (subscribers ?? []) as Subscriber[];
  let sent = 0;
  let failed = 0;

  // 5. Envío por tandas, para no abrir cientos de conexiones a la vez.
  for (let i = 0; i < recipients.length; i += CONCURRENCY) {
    const batch = recipients.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (person) => {
        const link = unsubscribeUrl(person.unsubscribe_token);
        const email = renderCampaignEmail({
          preheader: update.preheader,
          body: { ...update.body, ctaUrl: ctaAbsolute },
          unsubscribeUrl: link,
        });
        return sendEmail({
          to: person.email,
          subject: update.subject,
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

  await db
    .from("newsletter_campaigns")
    .update({
      status: failed > 0 && sent === 0 ? "failed" : "sent",
      recipients_total: recipients.length,
      recipients_sent: sent,
      recipients_failed: failed,
      sent_at: new Date().toISOString(),
    })
    .eq("id", campaign.id);

  // Se registra el recuento, nunca a quién se escribió (Regla 11).
  console.log(
    `[boletin] campaña ${campaign.id} · modelo=${update.model} · enviados=${sent} fallidos=${failed}`,
  );

  return json({
    campaignId: campaign.id,
    model: update.model,
    subject: update.subject,
    recipients: recipients.length,
    sent,
    failed,
    // Aviso honesto: si la lista llegó al tope, quedan personas fuera.
    truncated: recipients.length === MAX_PER_RUN,
  });
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
