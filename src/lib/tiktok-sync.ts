/**
 * Trae los últimos videos reales de TikTok y los guarda en Supabase.
 * `TikTokSection.tsx` los lee desde ahí con la clave anónima (ver
 * migración 0009_social_feeds.sql) — este archivo es el único que
 * habla con la API de TikTok.
 *
 * A diferencia de Instagram, el access token de TikTok expira cada 24
 * horas. Por eso el flujo inicial (una sola vez, a mano) guarda un
 * REFRESH token de larga duración en `tiktok_oauth_state`, y cada
 * sincronización lo usa para pedir un access token nuevo antes de leer
 * los videos. El procedimiento completo para conseguir ese refresh
 * token inicial está en SOCIAL_FEEDS_SETUP.md.
 *
 * SECURITY_RULES Regla 3: TIKTOK_CLIENT_KEY/SECRET son secretos de
 * servidor. Sin prefijo VITE_, nunca llegan al navegador.
 */

import { serviceClient } from "@/lib/supabase-server";
import { readEnv } from "@/lib/runtime-env";

/** Cuántos videos se traen por sincronización. La grilla del home solo usa 4. */
const FETCH_LIMIT = 12;

type TokenRow = {
  access_token: string;
  refresh_token: string;
  expires_at: string;
};

type TikTokTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type TikTokVideo = {
  id: string;
  cover_image_url?: string;
  embed_link?: string;
  share_url?: string;
  video_description?: string;
  create_time?: number;
  duration?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  view_count?: number;
};

type TikTokVideoListResponse = {
  data?: { videos?: TikTokVideo[] };
  error?: { code?: string; message?: string };
};

export type TikTokSyncResult =
  | { ok: false; reason: string }
  | { ok: true; postsSynced: number };

export function tiktokSyncConfigured(): boolean {
  return Boolean(readEnv("TIKTOK_CLIENT_KEY") && readEnv("TIKTOK_CLIENT_SECRET"));
}

/**
 * Da de alta el refresh token inicial (el que se obtiene a mano una
 * sola vez siguiendo SOCIAL_FEEDS_SETUP.md). Las sincronizaciones
 * siguientes ya no necesitan esto: cada una guarda el refresh token
 * nuevo que TikTok entrega junto con el access token.
 */
export async function seedTikTokRefreshToken(refreshToken: string): Promise<{ ok: boolean; reason?: string }> {
  const db = serviceClient();
  if (!db) return { ok: false, reason: "Base de datos no configurada." };

  const { error } = await db.from("tiktok_oauth_state").upsert({
    id: "main",
    access_token: "",
    refresh_token: refreshToken,
    // Vencido a propósito: fuerza a que la primera sincronización pida
    // un access token nuevo en vez de intentar usar uno vacío.
    expires_at: new Date(0).toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

async function refreshAccessToken(
  clientKey: string,
  clientSecret: string,
  refreshToken: string,
): Promise<{ ok: true; token: TikTokTokenResponse } | { ok: false; reason: string }> {
  try {
    const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    const payload = (await response.json()) as TikTokTokenResponse;
    if (!response.ok || !payload.access_token) {
      return {
        ok: false,
        reason: payload.error_description ?? payload.error ?? `TikTok respondió ${response.status}.`,
      };
    }
    return { ok: true, token: payload };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "Fallo de red." };
  }
}

/**
 * Refresca el access token si hace falta y trae los últimos videos
 * públicos de la cuenta conectada. Reemplaza el contenido de
 * `tiktok_posts` en Supabase (upsert por id de TikTok).
 */
export async function syncTikTokFeed(): Promise<TikTokSyncResult> {
  const clientKey = readEnv("TIKTOK_CLIENT_KEY");
  const clientSecret = readEnv("TIKTOK_CLIENT_SECRET");
  if (!clientKey || !clientSecret) {
    return { ok: false, reason: "Falta TIKTOK_CLIENT_KEY o TIKTOK_CLIENT_SECRET." };
  }

  const db = serviceClient();
  if (!db) return { ok: false, reason: "Base de datos no configurada." };

  const { data: stateRow, error: stateError } = await db
    .from("tiktok_oauth_state")
    .select("access_token, refresh_token, expires_at")
    .eq("id", "main")
    .maybeSingle();

  if (stateError) return { ok: false, reason: stateError.message };
  if (!stateRow) {
    return {
      ok: false,
      reason:
        "No hay refresh token guardado. Sigue el paso de TikTok en SOCIAL_FEEDS_SETUP.md para conectar la cuenta la primera vez.",
    };
  }

  const state = stateRow as TokenRow;
  const stillValid = new Date(state.expires_at).getTime() - Date.now() > 60_000;

  let accessToken = state.access_token;
  if (!stillValid) {
    const refreshed = await refreshAccessToken(clientKey, clientSecret, state.refresh_token);
    if (!refreshed.ok) return { ok: false, reason: `Renovar el token falló: ${refreshed.reason}` };

    accessToken = refreshed.token.access_token!;
    const newRefreshToken = refreshed.token.refresh_token ?? state.refresh_token;
    const expiresAt = new Date(Date.now() + (refreshed.token.expires_in ?? 0) * 1000).toISOString();

    const { error: upsertError } = await db.from("tiktok_oauth_state").upsert({
      id: "main",
      access_token: accessToken,
      refresh_token: newRefreshToken,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    });
    if (upsertError) {
      console.error("[tiktok] no se pudo guardar el token renovado:", upsertError.message);
    }
  }

  const fields = [
    "id",
    "cover_image_url",
    "embed_link",
    "share_url",
    "video_description",
    "create_time",
    "duration",
    "like_count",
    "comment_count",
    "share_count",
    "view_count",
  ].join(",");

  let payload: TikTokVideoListResponse;
  try {
    const response = await fetch(
      `https://open.tiktokapis.com/v2/video/list/?fields=${fields}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ max_count: FETCH_LIMIT }),
      },
    );
    payload = (await response.json()) as TikTokVideoListResponse;
    if (!response.ok || payload.error?.code) {
      return {
        ok: false,
        reason: payload.error?.message ?? `TikTok respondió ${response.status}.`,
      };
    }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "Fallo de red." };
  }

  const videos = payload.data?.videos ?? [];
  const postRows = videos
    .filter((v) => v.cover_image_url)
    .map((v) => ({
      id: v.id,
      cover_url: v.cover_image_url ?? "",
      video_url: v.embed_link ?? null,
      caption: v.video_description ?? "",
      likes_count: v.like_count ?? 0,
      comments_count: v.comment_count ?? null,
      shares_count: v.share_count ?? null,
      views_count: v.view_count ?? null,
      share_url: v.share_url ?? null,
      duration: v.duration ?? null,
      created_at: v.create_time
        ? new Date(v.create_time * 1000).toISOString()
        : new Date().toISOString(),
      synced_at: new Date().toISOString(),
    }));

  if (postRows.length > 0) {
    const { error } = await db
      .from("tiktok_posts")
      .upsert(postRows, { onConflict: "id" });
    if (error) {
      console.error("[tiktok] no se pudo guardar tiktok_posts:", error.message);
      return { ok: false, reason: error.message };
    }
  }

  console.log(`[tiktok] sincronización · videos=${postRows.length}`);
  return { ok: true, postsSynced: postRows.length };
}
