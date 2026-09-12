-- ---------------------------------------------------------------------
-- Feeds reales de Instagram y TikTok en el home.
--
-- `src/components/yei/InstagramSection.tsx` y `TikTokSection.tsx` leen
-- estas tablas desde el NAVEGADOR con la clave anónima (son fotos
-- públicas de la marca, no hay dato de cliente). Por eso, a diferencia
-- del resto de tablas de este proyecto (pedidos, cupones, mensajes de
-- contacto), estas SÍ llevan una política de lectura pública.
--
-- Quién ESCRIBE: solo el servidor, con la clave de servicio, desde
-- `src/lib/instagram-sync.ts` y `src/lib/tiktok-sync.ts`. La tarea
-- programada de Cloudflare (ver wrangler.toml) llama a esas funciones
-- una vez al día; también se pueden disparar a mano por
-- POST /api/social/sync (ver `src/lib/social-sync-endpoint.ts`).
--
-- Si estas tablas están vacías o no existen, el sitio sigue
-- funcionando: los componentes traen un set de publicaciones de
-- ejemplo (`DEFAULT_POSTS` en cada componente) mientras no haya datos
-- reales.
-- ---------------------------------------------------------------------

create table if not exists instagram_posts (
  id text primary key,
  image_url text not null,
  caption text not null default '',
  likes_count integer not null default 0,
  comments_count integer,
  permalink text,
  media_type text,
  tag text,
  created_at timestamptz not null default now(),
  synced_at timestamptz not null default now()
);

create table if not exists instagram_reels (
  id text primary key,
  video_title text not null,
  video_subtitle text,
  video_description text,
  cover_url text not null,
  reel_url text,
  duration text,
  likes_count integer,
  comments_count integer,
  synced_at timestamptz not null default now()
);

create table if not exists tiktok_posts (
  id text primary key,
  cover_url text not null,
  video_url text,
  caption text not null default '',
  likes_count integer not null default 0,
  comments_count integer,
  shares_count integer,
  views_count integer,
  share_url text,
  duration integer,
  created_at timestamptz not null default now(),
  synced_at timestamptz not null default now()
);

-- Token de larga duración de TikTok: se renueva solo cada vez que corre
-- la sincronización (ver `tiktok-sync.ts`). Una sola fila, id fijo, para
-- no tener que crear una tabla de configuración aparte.
create table if not exists tiktok_oauth_state (
  id text primary key default 'main',
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table instagram_posts enable row level security;
alter table instagram_reels enable row level security;
alter table tiktok_posts enable row level security;
alter table tiktok_oauth_state enable row level security;

-- Lectura pública: son publicaciones ya públicas en Instagram/TikTok,
-- el mismo contenido que cualquiera ve en esas apps. Nadie puede
-- escribir con la clave anónima: no hay política de insert/update/
-- delete, así que esas operaciones quedan cerradas al navegador y solo
-- las hace el servidor con la clave de servicio (que salta RLS).
create policy "lectura publica de instagram_posts"
  on instagram_posts for select
  using (true);

create policy "lectura publica de instagram_reels"
  on instagram_reels for select
  using (true);

create policy "lectura publica de tiktok_posts"
  on tiktok_posts for select
  using (true);

-- tiktok_oauth_state NO lleva política de lectura: guarda un token de
-- acceso, no es contenido público. Solo el servidor (clave de
-- servicio) lo lee o lo escribe.
