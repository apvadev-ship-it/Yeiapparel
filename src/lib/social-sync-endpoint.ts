/**
 * POST /api/social/sync — dispara a mano la sincronización de
 * Instagram y TikTok, en vez de esperar a la tarea programada diaria.
 * Útil para probar que las credenciales quedaron bien puestas nada más
 * configurarlas (ver SOCIAL_FEEDS_SETUP.md).
 *
 * Protegido con SOCIAL_SYNC_ADMIN_TOKEN, mismo patrón que
 * /api/boletin/campana: sin token configurado el endpoint queda
 * apagado, y el que llega se compara en tiempo constante
 * (SECURITY_RULES Regla 10).
 */

import { readEnv } from "@/lib/runtime-env";
import { constantTimeEqual, bearerToken } from "@/lib/constant-time";
import { syncInstagramFeed, instagramSyncConfigured } from "@/lib/instagram-sync";
import { syncTikTokFeed, tiktokSyncConfigured } from "@/lib/tiktok-sync";

export const SOCIAL_SYNC_PATH = "/api/social/sync";

export async function handleSocialSync(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: "Method Not Allowed" }, 405);
  }

  const adminToken = readEnv("SOCIAL_SYNC_ADMIN_TOKEN");
  if (!adminToken) {
    return json(
      {
        error:
          "El endpoint de sincronización está apagado. Configura SOCIAL_SYNC_ADMIN_TOKEN para habilitarlo.",
      },
      503,
    );
  }

  if (!constantTimeEqual(bearerToken(request), adminToken)) {
    return json({ error: "No autorizado." }, 401);
  }

  const instagram = instagramSyncConfigured()
    ? await syncInstagramFeed()
    : { ok: false, reason: "INSTAGRAM_ACCESS_TOKEN no configurado." };

  const tiktok = tiktokSyncConfigured()
    ? await syncTikTokFeed()
    : { ok: false, reason: "TIKTOK_CLIENT_KEY no configurado." };

  return json({ instagram, tiktok }, 200);
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
