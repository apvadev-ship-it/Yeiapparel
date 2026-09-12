import { createClient } from "@supabase/supabase-js";
import { readPublicEnv } from "@/lib/runtime-env";

// Se lee con `readPublicEnv` (igual que el resto del proyecto) en vez de
// `import.meta.env` directo: así, si Cloudflare solo entrega estas
// variables en tiempo de ejecución (el `env` del Worker) y no en el
// build, este cliente igual las encuentra. Son valores públicos —
// prefijo VITE_, protegidos por RLS en Supabase— así que no aplica la
// Regla 3 (esa es solo para secretos de servidor).
const supabaseUrl = readPublicEnv("VITE_SUPABASE_URL") || "";
const supabaseAnonKey = readPublicEnv("VITE_SUPABASE_ANON_KEY") || "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: (...args) => fetch(...args),
      },
    })
  : null;

export interface InstagramPost {
  id: string;
  image_url: string;
  caption: string;
  likes_count: number;
  comments_count?: number;
  permalink?: string;
  media_type?: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  created_at?: string;
  tag?: string;
}

export interface InstagramReel {
  id: string;
  video_title: string;
  video_subtitle: string;
  video_description: string;
  cover_url: string;
  reel_url?: string;
  duration?: string;
  likes_count?: number;
  comments_count?: number;
}

export interface TikTokPost {
  id: string;
  cover_url: string;
  video_url?: string;
  caption: string;
  likes_count: number;
  comments_count?: number;
  shares_count?: number;
  views_count?: number;
  share_url?: string;
  duration?: number;
  created_at?: string;
}
