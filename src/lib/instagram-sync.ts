/**
 * Trae las últimas publicaciones reales de Instagram y las guarda en
 * Supabase. `InstagramSection.tsx` las lee desde ahí (a través de
 * `social-feed.ts`, en el servidor) — este archivo es el único que
 * habla con la fuente externa.
 *
 * Dos formas de conseguir los datos, en este orden de preferencia:
 *
 * 1. Behold (behold.so) — BEHOLD_FEED_ID. Behold ya resuelve todo el
 *    lío de la app de Meta y el token que expira: conectas la cuenta
 *    una vez en su panel y te da una URL pública de solo lectura
 *    (`https://feeds.behold.so/<FEED_ID>`) con los posts en JSON. El
 *    ID del feed hace de "secreto" — sin él nadie más puede leer esa
 *    URL — pero no es tan sensible como un token de Meta, así que
 *    igual se lee como variable de servidor por prolijidad.
 *
 * 2. Instagram Graph API directa — INSTAGRAM_ACCESS_TOKEN +
 *    INSTAGRAM_BUSINESS_ACCOUNT_ID. Requiere la cuenta profesional
 *    vinculada a una página de Facebook y una app en Meta for
 *    Developers. Queda como alternativa si en algún momento se deja
 *    Behold. El procedimiento de cualquiera de las dos vías está en
 *    SOCIAL_FEEDS_SETUP.md.
 *
 * SECURITY_RULES Regla 3: estas variables son secretos de servidor.
 * Sin prefijo VITE_, nunca llegan al navegador.
 */

import { serviceClient } from "@/lib/supabase-server";
import { readEnv } from "@/lib/runtime-env";

const GRAPH_API_VERSION = "v21.0";

/** Cuántas publicaciones se traen por sincronización. La grilla del home solo usa 4. */
const FETCH_LIMIT = 12;

export type InstagramSyncResult =
  | { ok: false; reason: string }
  | { ok: true; postsSynced: number; reelSynced: boolean };

export function instagramSyncConfigured(): boolean {
  return Boolean(
    readEnv("BEHOLD_FEED_ID") ||
      (readEnv("INSTAGRAM_ACCESS_TOKEN") && readEnv("INSTAGRAM_BUSINESS_ACCOUNT_ID")),
  );
}

/** Fila común que termina en `instagram_posts`, venga de la fuente que venga. */
type PostRow = {
  id: string;
  image_url: string;
  caption: string;
  likes_count: number;
  comments_count: number | null;
  permalink: string | null;
  media_type: string | null;
  created_at: string;
  synced_at: string;
};

/** El reel destacado del modal: el video real más reciente, si hay uno. */
type ReelSource = {
  id: string;
  caption: string;
  coverUrl: string;
  permalink: string | null;
  likeCount: number | null;
  commentsCount: number | null;
};

export async function syncInstagramFeed(): Promise<InstagramSyncResult> {
  const db = serviceClient();
  if (!db) return { ok: false, reason: "Base de datos no configurada." };

  const beholdFeedId = readEnv("BEHOLD_FEED_ID");
  const fetched = beholdFeedId
    ? await fetchFromBehold(beholdFeedId)
    : await fetchFromMetaGraphApi();

  if (!fetched.ok) return fetched;
  const { postRows, reel } = fetched;

  if (postRows.length > 0) {
    const { error } = await db
      .from("instagram_posts")
      .upsert(postRows, { onConflict: "id" });
    if (error) {
      console.error("[instagram] no se pudo guardar instagram_posts:", error.message);
      return { ok: false, reason: error.message };
    }
  }

  let reelSynced = false;
  if (reel) {
    const { error } = await db.from("instagram_reels").upsert(
      [
        {
          id: reel.id,
          video_title: "YEI APPAREL · Instagram",
          video_subtitle: "",
          video_description: reel.caption,
          cover_url: reel.coverUrl,
          reel_url: reel.permalink,
          likes_count: reel.likeCount,
          comments_count: reel.commentsCount,
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

type FetchResult =
  | { ok: true; postRows: PostRow[]; reel: ReelSource | null }
  | { ok: false; reason: string };

// ---------------------------------------------------------------------
// Behold (behold.so)
// ---------------------------------------------------------------------

type BeholdPost = {
  id: string;
  timestamp?: string;
  permalink?: string;
  mediaType?: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  mediaUrl?: string;
  /** Solo en videos: la miniatura estática (posavasos), separada del stream. */
  thumbnailUrl?: string;
  caption?: string;
  likeCount?: number;
  commentsCount?: number;
  /**
   * Variantes ya optimizadas y re-alojadas por Behold (dominio
   * behold.pictures). A diferencia de `mediaUrl` —que es el enlace
   * directo de Instagram, con una firma que expira a los pocos días—
   * estas sí sirven para guardarlas y mostrarlas sin que se rompan
   * solas entre una sincronización y la siguiente.
   */
  sizes?: {
    medium?: { mediaUrl?: string };
    large?: { mediaUrl?: string };
  };
};

type BeholdFeedResponse = {
  posts?: BeholdPost[];
};

/** La portada para la grilla: la variante optimizada de Behold si existe, si no la cruda de Instagram. */
function beholdCoverImage(item: BeholdPost): string {
  return item.sizes?.medium?.mediaUrl ?? item.sizes?.large?.mediaUrl ?? item.mediaUrl ?? "";
}

async function fetchFromBehold(feedId: string): Promise<FetchResult> {
  let payload: BeholdFeedResponse;
  try {
    const response = await fetch(`https://feeds.behold.so/${feedId}`);
    if (!response.ok) {
      return { ok: false, reason: `Behold respondió ${response.status}. Revisa BEHOLD_FEED_ID.` };
    }
    payload = (await response.json()) as BeholdFeedResponse;
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "Fallo de red con Behold." };
  }

  const items = (payload.posts ?? []).slice(0, FETCH_LIMIT);
  const postRows: PostRow[] = items
    .filter((item) => item.mediaUrl)
    .map((item) => ({
      id: item.id,
      // En video se guarda el stream real (autoplay en la grilla, igual
      // que ya hacían los clips de ejemplo); en foto/carrusel, la
      // variante optimizada de Behold.
      image_url: item.mediaType === "VIDEO" ? (item.mediaUrl ?? "") : beholdCoverImage(item),
      caption: item.caption ?? "",
      likes_count: item.likeCount ?? 0,
      comments_count: item.commentsCount ?? null,
      permalink: item.permalink ?? null,
      media_type: item.mediaType ?? null,
      created_at: item.timestamp ?? new Date().toISOString(),
      synced_at: new Date().toISOString(),
    }));

  const latestVideo = items.find((item) => item.mediaType === "VIDEO" && item.mediaUrl);
  const reel: ReelSource | null = latestVideo
    ? {
        id: latestVideo.id,
        caption: latestVideo.caption ?? "",
        coverUrl: latestVideo.thumbnailUrl ?? latestVideo.mediaUrl ?? "",
        permalink: latestVideo.permalink ?? null,
        likeCount: latestVideo.likeCount ?? null,
        commentsCount: latestVideo.commentsCount ?? null,
      }
    : null;

  return { ok: true, postRows, reel };
}

// ---------------------------------------------------------------------
// Instagram Graph API directa (alternativa si no se usa Behold)
// ---------------------------------------------------------------------

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

async function fetchFromMetaGraphApi(): Promise<FetchResult> {
  const token = readEnv("INSTAGRAM_ACCESS_TOKEN");
  const accountId = readEnv("INSTAGRAM_BUSINESS_ACCOUNT_ID");
  if (!token || !accountId) {
    return {
      ok: false,
      reason:
        "Falta BEHOLD_FEED_ID, o (como alternativa) INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_BUSINESS_ACCOUNT_ID.",
    };
  }

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
  const postRows: PostRow[] = items
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

  const latestVideo = items.find((item) => item.media_type === "VIDEO");
  const reel: ReelSource | null = latestVideo
    ? {
        id: latestVideo.id,
        caption: latestVideo.caption ?? "",
        coverUrl: latestVideo.thumbnail_url ?? latestVideo.media_url ?? "",
        permalink: latestVideo.permalink ?? null,
        likeCount: latestVideo.like_count ?? null,
        commentsCount: latestVideo.comments_count ?? null,
      }
    : null;

  return { ok: true, postRows, reel };
}
