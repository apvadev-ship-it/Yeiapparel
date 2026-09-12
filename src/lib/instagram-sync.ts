/**
 * Trae las últimas publicaciones reales de Instagram y las guarda en
 * Supabase. `InstagramSection.tsx` las lee desde ahí con la clave
 * anónima (ver migración 0009_social_feeds.sql) — este archivo es el
 * único que habla con Meta.
 *
 * Requiere una cuenta de Instagram profesional (Business o Creator)
 * vinculada a una página de Facebook, y un token de la Instagram Graph
 * API con permiso `instagram_basic`. El procedimiento completo para
 * conseguir ese token está en SOCIAL_FEEDS_SETUP.md — aquí solo se
 * consume.
 *
 * SECURITY_RULES Regla 3: INSTAGRAM_ACCESS_TOKEN es un secreto de
 * servidor. Sin prefijo VITE_, nunca llega al navegador.
 */

import { serviceClient } from "@/lib/supabase-server";
import { readEnv } from "@/lib/runtime-env";

const GRAPH_API_VERSION = "v21.0";

/** Cuántas publicaciones se traen por sincronización. La grilla del home solo usa 4. */
const FETCH_LIMIT = 12;

type GraphMediaItem = {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
};

type GraphMediaResponse = {
  data?: GraphMediaItem[];
  error?: { message: string };
};

export type InstagramSyncResult =
  | { ok: false; reason: string }
  | { ok: true; postsSynced: number; reelSynced: boolean };

export function instagramSyncConfigured(): boolean {
  return Boolean(
    readEnv("INSTAGRAM_ACCESS_TOKEN") &&
      readEnv("INSTAGRAM_BUSINESS_ACCOUNT_ID"),
  );
}

/**
 * Llama a la Instagram Graph API y reemplaza el contenido de
 * `instagram_posts` / `instagram_reels` en Supabase con lo que haya
 * ahora mismo en la cuenta real. Se puede llamar tantas veces como se
 * quiera: es idempotente (upsert por id de Instagram).
 */
export async function syncInstagramFeed(): Promise<InstagramSyncResult> {
  const token = readEnv("INSTAGRAM_ACCESS_TOKEN");
  const accountId = readEnv("INSTAGRAM_BUSINESS_ACCOUNT_ID");
  if (!token || !accountId) {
    return { ok: false, reason: "Falta INSTAGRAM_ACCESS_TOKEN o INSTAGRAM_BUSINESS_ACCOUNT_ID." };
  }

  const db = serviceClient();
  if (!db) return { ok: false, reason: "Base de datos no configurada." };

  const fields =
    "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count";
  const url =
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${accountId}/media` +
    `?fields=${fields}&limit=${FETCH_LIMIT}&access_token=${encodeURIComponent(token)}`;

  let payload: GraphMediaResponse;
  try {
    const response = await fetch(url);
    payload = (await response.json()) as GraphMediaResponse;
    if (!response.ok || payload.error) {
      return {
        ok: false,
        reason: payload.error?.message ?? `Instagram respondió ${response.status}.`,
      };
    }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "Fallo de red." };
  }

  const items = payload.data ?? [];
  const postRows = items
    .filter((item) => item.media_url || item.thumbnail_url)
    .map((item) => ({
      id: item.id,
      image_url:
        item.media_type === "VIDEO"
          ? (item.thumbnail_url ?? item.media_url ?? "")
          : (item.media_url ?? item.thumbnail_url ?? ""),
      caption: item.caption ?? "",
      likes_count: item.like_count ?? 0,
      comments_count: item.comments_count ?? null,
      permalink: item.permalink ?? null,
      media_type: item.media_type ?? null,
      created_at: item.timestamp ?? new Date().toISOString(),
      synced_at: new Date().toISOString(),
    }));

  if (postRows.length > 0) {
    const { error } = await db
      .from("instagram_posts")
      .upsert(postRows, { onConflict: "id" });
    if (error) {
      console.error("[instagram] no se pudo guardar instagram_posts:", error.message);
      return { ok: false, reason: error.message };
    }
  }

  // El reel destacado del modal es el video real más reciente, si hay uno.
  const latestVideo = items.find((item) => item.media_type === "VIDEO");
  let reelSynced = false;
  if (latestVideo) {
    const { error } = await db.from("instagram_reels").upsert(
      [
        {
          id: latestVideo.id,
          video_title: "YEI APPAREL · Instagram",
          video_subtitle: "",
          video_description: latestVideo.caption ?? "",
          cover_url: latestVideo.thumbnail_url ?? latestVideo.media_url ?? "",
          reel_url: latestVideo.permalink ?? null,
          likes_count: latestVideo.like_count ?? null,
          comments_count: latestVideo.comments_count ?? null,
          synced_at: new Date().toISOString(),
        },
      ],
      { onConflict: "id" },
    );
    if (!error) reelSynced = true;
    else console.error("[instagram] no se pudo guardar instagram_reels:", error.message);
  }

  console.log(`[instagram] sincronización · publicaciones=${postRows.length} · reel=${reelSynced}`);
  return { ok: true, postsSynced: postRows.length, reelSynced };
}
