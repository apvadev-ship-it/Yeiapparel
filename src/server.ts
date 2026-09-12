import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { checkRateLimit, tooManyRequests } from "./lib/rate-limit";
import { rememberRuntimeEnv } from "./lib/runtime-env";
import { withSecurityHeaders } from "./lib/security-headers";
import { handleWompiWebhook, WOMPI_WEBHOOK_PATH } from "./lib/wompi-webhook";
import { handleWompiRefund, WOMPI_REFUND_PATH } from "./lib/wompi-refunds";
import { AVAILABILITY_PATH } from "./lib/availability";
import { handleAvailabilityRequest } from "./lib/availability-sheet";
import { handleUnsubscribe, UNSUBSCRIBE_PATH, siteUrl } from "./lib/newsletter";
import { handleCampaign, CAMPAIGN_PATH } from "./lib/newsletter-campaign";
import {
  handleAnnouncement,
  ANNOUNCEMENT_PATH,
} from "./lib/newsletter-announcement";
import { checkForCatalogUpdates } from "./lib/catalog-watch";
import { checkLaunchReminders } from "./lib/launch-reminders";
import { LAUNCH_DATE } from "./lib/next-collection";
import { renderLaunchIcs, ICS_PATH } from "./lib/calendar-ics";
import { handleSocialSync, SOCIAL_SYNC_PATH } from "./lib/social-sync-endpoint";
import { syncInstagramFeed, instagramSyncConfigured } from "./lib/instagram-sync";
import { syncTikTokFeed, tiktokSyncConfigured } from "./lib/tiktok-sync";
import { sendWeeklyReport } from "./lib/weekly-report";

type ServerEntry = {
  fetch: (
    request: Request,
    env: unknown,
    ctx: unknown,
  ) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(
  response: Response,
): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(
    consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`),
  );
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as {
      unhandled?: unknown;
      message?: unknown;
    };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

/**
 * Decide qué atiende cada petición. Separado del `fetch` para que las
 * cabeceras de seguridad se apliquen en un solo sitio y ningún camino
 * de salida se las salte por descuido.
 */
async function route(
  request: Request,
  env: unknown,
  ctx: unknown,
): Promise<Response> {
  try {
    const { pathname } = new URL(request.url);

    // El webhook de Wompi se atiende antes que el router: es una llamada
    // servidor a servidor, sin sesión ni interfaz.
    if (pathname === WOMPI_WEBHOOK_PATH) {
      return await handleWompiWebhook(request);
    }

    // El endpoint interno de devoluciones, por lo mismo. Está protegido
    // con WOMPI_ADMIN_TOKEN y apagado si ese token no existe. El límite
    // es estrecho a propósito: aquí lo que se frena es probar tokens a
    // fuerza bruta, y un uso legítimo son unas pocas llamadas al día.
    if (pathname === WOMPI_REFUND_PATH) {
      const limited = checkRateLimit(request, "devoluciones", 10, 60_000);
      if (!limited.allowed) return tooManyRequests(limited.retryAfterSeconds);
      return await handleWompiRefund(request);
    }

    // La disponibilidad se lee de una hoja de Google en el servidor y
    // se sirve ya cacheada. Va antes del router porque es una
    // respuesta JSON, sin interfaz. El límite es holgado: es una
    // lectura pública y una sola visita puede pedirla varias veces al
    // navegar entre fichas.
    if (pathname === AVAILABILITY_PATH) {
      const limited = checkRateLimit(request, "disponibilidad", 120, 60_000);
      if (!limited.allowed) return tooManyRequests(limited.retryAfterSeconds);
      return await handleAvailabilityRequest(request);
    }

    // Baja del boletín. Va antes del router porque el enlace se abre
    // desde un cliente de correo, y Gmail hace además un POST de un
    // clic contra la misma ruta. El límite es amplio: darse de baja
    // nunca debe fallar por un contador.
    if (pathname === UNSUBSCRIBE_PATH) {
      const limited = checkRateLimit(request, "boletin-baja", 60, 60_000);
      if (!limited.allowed) return tooManyRequests(limited.retryAfterSeconds);
      return await handleUnsubscribe(request);
    }

    // Campañas escritas por el agente. Protegido con
    // NEWSLETTER_ADMIN_TOKEN y apagado si ese token no existe. El
    // límite es estrecho: cada llamada escribe a toda la lista y gasta
    // una petición al modelo.
    if (pathname === CAMPAIGN_PATH) {
      const limited = checkRateLimit(request, "boletin-campana", 5, 60_000);
      if (!limited.allowed) return tooManyRequests(limited.retryAfterSeconds);
      return await handleCampaign(request);
    }

    // Anuncio de catálogo: mismo tipo de acción que la campaña de IA
    // (escribe a toda la lista), mismo límite estrecho.
    if (pathname === ANNOUNCEMENT_PATH) {
      const limited = checkRateLimit(request, "boletin-anuncio", 5, 60_000);
      if (!limited.allowed) return tooManyRequests(limited.retryAfterSeconds);
      return await handleAnnouncement(request);
    }

    // Archivo .ics de "agregar al calendario" — lo usa el botón
    // "Recuérdamelo" del correo de cuenta regresiva
    // (`launch-reminders.ts`). Funciona sin sesión de ningún tipo, a
    // diferencia del enlace de Google Calendar que reemplazó (ver
    // `calendar-ics.ts` para el porqué). Público y de lectura.
    // Sincronización manual de Instagram/TikTok. Protegido con
    // SOCIAL_SYNC_ADMIN_TOKEN y apagado si ese token no existe. Límite
    // estrecho: cada llamada hace varias peticiones salientes a Meta y
    // TikTok, y el uso normal es probar una vez tras configurar.
    if (pathname === SOCIAL_SYNC_PATH) {
      const limited = checkRateLimit(request, "social-sync", 5, 60_000);
      if (!limited.allowed) return tooManyRequests(limited.retryAfterSeconds);
      return await handleSocialSync(request);
    }

    if (pathname === ICS_PATH) {
      const limited = checkRateLimit(request, "cronometro-ics", 60, 60_000);
      if (!limited.allowed) return tooManyRequests(limited.retryAfterSeconds);
      const ics = renderLaunchIcs({
        launchDate: LAUNCH_DATE,
        siteUrl: siteUrl(),
      });
      return new Response(ics, {
        headers: {
          "content-type": "text/calendar; charset=utf-8",
          "content-disposition":
            'attachment; filename="yei-nueva-coleccion.ics"',
        },
      });
    }

    // Resto de peticiones que escriben (el checkout entra por aquí, como
    // función de servidor). Una persona hace un pedido; veinte por minuto
    // ya no es una persona.
    if (request.method === "POST") {
      const limited = checkRateLimit(request, "post", 20, 60_000);
      if (!limited.allowed) return tooManyRequests(limited.retryAfterSeconds);
    }

    const handler = await getServerEntry();
    const response = await handler.fetch(request, env, ctx);
    return await normalizeCatastrophicSsrResponse(response);
  } catch (error) {
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    // En Cloudflare las variables de entorno llegan aquí, en `env`, y no
    // en `process.env`. Se guardan de una vez para que el resto del
    // servidor (firma del cobro, webhook, devoluciones) pueda leerlas.
    // Va antes de todo lo demás: sin esto, en producción no habría
    // secretos y la pasarela se apagaría sin decir por qué.
    rememberRuntimeEnv(env);

    // Toda salida pasa por aquí, incluida la página de error del catch:
    // una respuesta sin cabeceras de seguridad es la que aprovecharía un
    // atacante, y suele ser justo la del camino de error.
    return withSecurityHeaders(await route(request, env, ctx));
  },

  /**
   * Tarea programada de Cloudflare (ver `wrangler.toml`, `[triggers]`).
   * No la llama ningún navegador: Cloudflare la ejecuta sola, a la
   * hora que diga el cron, sin que nadie tenga que visitar el sitio.
   *
   * Son las dos piezas que hacen "automático" el boletín: una revisa
   * si hay prendas nuevas o precios distintos desde la última vez
   * (`checkForCatalogUpdates`, en `catalog-watch.ts`), la otra revisa
   * si hoy toca alguno de los tres avisos de cuenta regresiva de la
   * próxima colección — 10 días, 3 días, el día del lanzamiento
   * (`checkLaunchReminders`, en `launch-reminders.ts`). Cada una
   * decide por su cuenta si hay algo que mandar; si no hay nada
   * nuevo, no hacen nada más.
   *
   * El reporte semanal de ventas (`sendWeeklyReport`, en
   * `weekly-report.ts`) es distinto: solo debe salir una vez por
   * semana, no cada vez que corre el cron diario. Por eso hay un
   * segundo cron en `wrangler.toml` (lunes) y aquí se distingue por
   * `event.cron` cuál de los dos disparó esta llamada.
   */
  async scheduled(
    event: { cron?: string },
    env: unknown,
    ctx: { waitUntil: (p: Promise<unknown>) => void },
  ) {
    rememberRuntimeEnv(env);

    const isWeeklyRun = event?.cron === "0 13 * * 1";
    if (isWeeklyRun) {
      ctx.waitUntil(
        sendWeeklyReport().catch((error) => {
          console.error("[reporte-semanal] la revisión programada falló:", error);
        }),
      );
      return;
    }

    ctx.waitUntil(
      checkForCatalogUpdates().catch((error) => {
        console.error("[catalogo] la revisión programada falló:", error);
      }),
    );
    ctx.waitUntil(
      checkLaunchReminders().catch((error) => {
        console.error("[lanzamiento] la revisión programada falló:", error);
      }),
    );
    if (instagramSyncConfigured()) {
      ctx.waitUntil(
        syncInstagramFeed().catch((error) => {
          console.error("[instagram] la sincronización programada falló:", error);
        }),
      );
    }
    if (tiktokSyncConfigured()) {
      ctx.waitUntil(
        syncTikTokFeed().catch((error) => {
          console.error("[tiktok] la sincronización programada falló:", error);
        }),
      );
    }
  },
};
