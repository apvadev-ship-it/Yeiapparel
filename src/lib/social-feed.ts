/**
 * Lee el feed de Instagram/TikTok para el home, desde el SERVIDOR.
 *
 * Por qué esto y no el cliente anónimo de Supabase directo desde el
 * navegador (`src/lib/supabase.ts`): ese cliente necesita
 * VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY presentes en el momento del
 * BUILD (Vite los incrusta en el bundle que descarga el navegador).
 * En este proyecto el build lo corre la integración de Cloudflare con
 * GitHub, y ese paso no tiene esas variables — poner el secreto en el
 * Worker no alcanza, porque eso es tiempo de EJECUCIÓN, no de build.
 * Una función de servidor (`createServerFn`, mismo patrón que
 * `getWeeklyTopSellingSlugs` en `orders.ts`) evita el problema entero:
 * corre en el Worker, que sí tiene SUPABASE_URL/SERVICE_ROLE_KEY como
 * secretos ya configurados.
 */

import { createServerFn } from "@tanstack/react-start";
import { serviceClient } from "@/lib/supabase-server";
import type { InstagramPost, InstagramReel, TikTokPost } from "@/lib/supabase";

export const getInstagramFeed = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ posts: InstagramPost[]; reel: InstagramReel | null }> => {
    const db = serviceClient();
    if (!db) return { posts: [], reel: null };

    const [postsResult, reelResult] = await Promise.all([
      db
        .from("instagram_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(6),
      db.from("instagram_reels").select("*").limit(1).maybeSingle(),
    ]);

    if (postsResult.error) {
      console.error("[instagram] no se pudo leer el feed:", postsResult.error.message);
    }
    if (reelResult.error) {
      console.error("[instagram] no se pudo leer el reel:", reelResult.error.message);
    }

    return {
      posts: (postsResult.data as InstagramPost[]) ?? [],
      reel: (reelResult.data as InstagramReel | null) ?? null,
    };
  },
);

export const getTikTokFeed = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ posts: TikTokPost[] }> => {
    const db = serviceClient();
    if (!db) return { posts: [] };

    const { data, error } = await db
      .from("tiktok_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(4);

    if (error) {
      console.error("[tiktok] no se pudo leer el feed:", error.message);
    }

    return { posts: (data as TikTokPost[]) ?? [] };
  },
);
