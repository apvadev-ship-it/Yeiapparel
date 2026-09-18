-- =====================================================================
-- YEI — todas las migraciones, en orden, en un solo archivo.
--
-- Pega ESTO COMPLETO en Supabase > SQL Editor > New query > Run.
-- Es idempotente (create table if not exists): correrlo dos veces
-- no rompe nada ni borra datos.
--
-- Generado desde los archivos 0001..0011. Si cambias uno de ellos,
-- vuelve a generar este.
-- =====================================================================


-- ///////////////////////////////////////////////////////////////////
-- 0001_orders.sql
-- ///////////////////////////////////////////////////////////////////

-- ---------------------------------------------------------------------
-- 0001 · Tabla de pedidos
--
-- Esta es la misma estructura que ya estaba documentada en el comentario
-- de src/lib/orders.ts. No se cambia ninguna columna: se versiona tal
-- cual estaba para que la base y el codigo no se separen.
--
-- SECURITY_RULES Regla 12: no existe ni existira columna para numero de
-- tarjeta, CVV/CVC, fecha de vencimiento ni datos de banda magnetica.
-- Esos datos jamas tocan este servidor: los captura Wompi en su dominio.
--
-- SECURITY_RULES Regla 11: se guardan solo los datos minimos para poder
-- despachar el pedido y facturarlo (nombre, correo, telefono, documento
-- y direccion). Nada mas.
-- ---------------------------------------------------------------------

create table if not exists orders (
  reference text primary key,
  status text not null default 'PENDING',
  total integer not null,
  amount_in_cents bigint not null,
  customer_name text,
  customer_email text,
  customer_phone text,
  customer_document text,
  shipping_address text,
  shipping_city text,
  shipping_notes text,
  items jsonb,
  transaction_id text,
  payment_method text,
  created_at timestamptz default now(),
  paid_at timestamptz
);

-- El webhook busca el pedido por transaction_id cuando necesita
-- reconciliar una devolucion.
create index if not exists orders_transaction_id_idx
  on orders (transaction_id);

create index if not exists orders_created_at_idx
  on orders (created_at desc);

-- RLS activo y SIN politicas: desde el navegador (clave anonima) no se
-- puede leer ni escribir nada. Solo entra la clave de servicio, que vive
-- unicamente en el servidor.
alter table orders enable row level security;

-- ///////////////////////////////////////////////////////////////////
-- 0002_processed_webhook_events.sql
-- ///////////////////////////////////////////////////////////////////

-- ---------------------------------------------------------------------
-- 0002 · Eventos de Wompi ya procesados (anti-repeticion)
--
-- SECURITY_RULES Regla 2: un evento con firma valida se puede reenviar
-- las veces que quiera quien lo haya capturado. Contra eso hay dos
-- defensas y aqui vive la segunda:
--
--   1. ventana de tiempo de 600 s sobre el campo `timestamp` del evento;
--   2. deduplicacion por identificador, que es esta tabla.
--
-- Por que no basta con guardar el id de la transaccion: Wompi manda
-- varios `transaction.updated` para la MISMA transaccion segun cambia de
-- estado (PENDING -> APPROVED, por ejemplo). Si se dedujera solo por
-- transaction_id se descartaria el evento bueno. Por eso la clave es
-- transaction_id + estado: los reintentos de Wompi (mismo id, mismo
-- estado) se descartan, y los cambios de estado si pasan.
--
-- Vive en la base y no en memoria porque en Cloudflare Workers cada
-- peticion puede caer en un aislado distinto: no hay memoria compartida.
-- ---------------------------------------------------------------------

create table if not exists processed_webhook_events (
  -- "<transaction_id>:<STATUS>"
  event_key text primary key,
  transaction_id text not null,
  event_type text not null,
  transaction_status text not null,
  reference text,
  -- `timestamp` del evento, en segundos epoch, tal como lo manda Wompi.
  event_timestamp bigint,
  received_at timestamptz not null default now(),
  -- Se llena cuando el trabajo posterior (actualizar el pedido) termino
  -- bien. Si quedo en null, el evento se recibio pero no se completo.
  processed_at timestamptz
);

create index if not exists processed_webhook_events_tx_idx
  on processed_webhook_events (transaction_id);

create index if not exists processed_webhook_events_received_idx
  on processed_webhook_events (received_at desc);

alter table processed_webhook_events enable row level security;

-- ///////////////////////////////////////////////////////////////////
-- 0003_refund_requests.sql
-- ///////////////////////////////////////////////////////////////////

-- ---------------------------------------------------------------------
-- 0003 · Devoluciones y obligaciones de pago manual
--
-- SECURITY_RULES Regla 7: en Colombia la mayoria de los medios que cobra
-- Wompi son IRREVERSIBLES. PSE, Nequi, Boton Bancolombia, Transferencia
-- Bancolombia, Efecty, Baloto y SuRed no tienen "devolver el cobro": el
-- dinero ya se movio y la unica forma de regresarlo es una transferencia
-- bancaria que hace una persona del negocio.
--
-- Esta tabla existe justamente para eso: cada devolucion que no se puede
-- ejecutar por API queda como una OBLIGACION DE PAGO pendiente, con su
-- monto y su estado, para que nadie la olvide y quede rastro contable.
--
-- Regla 12: no hay columnas de tarjeta. Para devolver por transferencia
-- se guarda banco / tipo de cuenta / titular y el numero de cuenta, que
-- son datos bancarios de destino, no datos de tarjeta. Si prefieres no
-- guardarlos, deja payout_account_* en null y gestiona ese dato fuera.
-- ---------------------------------------------------------------------

create table if not exists refund_requests (
  id uuid primary key,
  reference text not null,
  transaction_id text,
  -- 'card' | 'pse' | 'nequi' | 'bancolombia_transfer' | 'efecty' | ...
  payment_method_type text,
  amount_in_cents bigint not null,
  reason text,
  -- Como se resuelve:
  --   'api'    -> se pidio la anulacion/devolucion a Wompi;
  --   'payout' -> medio irreversible, hay que transferir a mano.
  settlement_kind text not null check (settlement_kind in ('api', 'payout')),
  -- 'REQUESTED' | 'API_SENT' | 'API_FAILED' | 'PENDING_MANUAL_PAYOUT'
  -- | 'PAID_OUT' | 'CANCELLED'
  status text not null default 'REQUESTED',
  -- Respuesta corta de Wompi cuando settlement_kind = 'api'.
  provider_response text,
  -- Datos para la transferencia manual, opcionales.
  payout_bank text,
  payout_account_type text,
  payout_account_holder text,
  payout_account_number text,
  -- Quien la registro (token interno usado), para auditoria.
  requested_by text,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create index if not exists refund_requests_reference_idx
  on refund_requests (reference);

create index if not exists refund_requests_status_idx
  on refund_requests (status);

-- Evita dos devoluciones vivas para el mismo pedido.
create unique index if not exists refund_requests_open_per_reference_idx
  on refund_requests (reference)
  where status in ('REQUESTED', 'API_SENT', 'PENDING_MANUAL_PAYOUT');

alter table refund_requests enable row level security;

-- ///////////////////////////////////////////////////////////////////
-- 0004_newsletter.sql
-- ///////////////////////////////////////////////////////////////////

-- ---------------------------------------------------------------------
-- Boletín: suscriptores y campañas.
--
-- Antes de esto, el formulario del 15% insertaba en `newsletter` DESDE EL
-- NAVEGADOR con la clave anónima. Eso significaba que cualquiera podía
-- llenar la tabla con correos inventados, y que el cupón se guardaba sin
-- que nadie lo enviara: la interfaz prometía "te llegará en unos
-- minutos" y no salía ningún correo. Ahora la escritura ocurre en el
-- servidor, con la clave de servicio, igual que los pedidos.
--
-- RLS activada y SIN políticas en las dos tablas: nadie llega desde el
-- navegador. Aquí hay datos personales (correo), y en Colombia la Ley
-- 1581 de 2012 obliga a custodiarlos.
-- ---------------------------------------------------------------------

create table if not exists newsletter (
  email text primary key,
  -- Cupón único del 15%. Se genera en el servidor con getRandomValues.
  coupon_code text not null unique,
  -- `pending` hasta que el correo de bienvenida sale de verdad. Sirve
  -- para reintentar los que fallaron sin volver a darlos de alta.
  welcome_status text not null default 'pending'
    check (welcome_status in ('pending', 'sent', 'failed')),
  -- Token para darse de baja sin iniciar sesión. Va en el enlace de cada
  -- correo. Es un secreto por suscriptor: quien lo tenga puede darse de
  -- baja, y nada más.
  unsubscribe_token text not null unique,
  -- Baja: se conserva la fila para no volver a escribirle por error si
  -- se resuscribe con el mismo correo desde otro sitio.
  unsubscribed_at timestamptz,
  -- Trazabilidad mínima del consentimiento (Ley 1581).
  source text not null default 'web',
  created_at timestamptz not null default now(),
  welcome_sent_at timestamptz
);

-- El envío de campañas recorre solo a los activos. Sin este índice, con
-- la lista crecida, cada campaña haría un recorrido completo de tabla.
create index if not exists newsletter_activos_idx
  on newsletter (created_at)
  where unsubscribed_at is null;

alter table newsletter enable row level security;

-- ---------------------------------------------------------------------
-- Campañas escritas por el agente de IA.
--
-- Se guarda el texto generado ANTES de enviar. Con el envío automático
-- activado, esta tabla es el único registro de qué se le dijo a los
-- clientes y con qué modelo se escribió: sin ella no habría forma de
-- auditar un correo que ya salió.
-- ---------------------------------------------------------------------

create table if not exists newsletter_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  preheader text not null,
  -- El cuerpo tal como lo devolvió el modelo, ya validado.
  body jsonb not null,
  -- Qué modelo lo escribió. Importa para poder repetir o descartar
  -- resultados cuando se cambie de modelo.
  model text not null,
  -- El tema que se le pidió, para saber de dónde salió el texto.
  brief text,
  status text not null default 'draft'
    check (status in ('draft', 'sending', 'sent', 'failed')),
  recipients_total integer not null default 0,
  recipients_sent integer not null default 0,
  recipients_failed integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table newsletter_campaigns enable row level security;


-- ///////////////////////////////////////////////////////////////////
-- 0005_contact_messages.sql
-- ///////////////////////////////////////////////////////////////////

-- ---------------------------------------------------------------------
-- Mensajes del formulario de contacto.
--
-- Antes, el formulario insertaba en esta tabla DESDE EL NAVEGADOR con la
-- clave anónima, sin validación de servidor y dependiendo solo de RLS
-- (que no tenía políticas: en la práctica, insertar fallaba en silencio
-- o requería una política pública insegura). Ahora la escritura ocurre
-- en el servidor, con la clave de servicio, igual que pedidos y boletín.
--
-- RLS activada y SIN políticas: nadie llega desde el navegador.
-- ---------------------------------------------------------------------

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_method text not null check (contact_method in ('email', 'telefono')),
  contact_value text not null,
  topic text not null check (topic in ('comprar', 'pedido', 'otro')),
  subtopic text not null,
  created_at timestamptz not null default now()
);

alter table contact_messages enable row level security;


-- ///////////////////////////////////////////////////////////////////
-- 0006_coupon_redemption.sql
-- ///////////////////////////////////////////////////////////////////

-- ---------------------------------------------------------------------
-- Canje de cupones del boletín.
--
-- El cupón único por suscriptor ya existía (columna `coupon_code` de
-- `newsletter`, generada con `crypto.getRandomValues` y protegida por
-- `unique`). Lo que faltaba era la mitad de "canjear": que caduque, que
-- se pueda usar una sola vez, y que el pedido quede marcado con qué
-- cupón y cuánto descuento se aplicó.
--
-- `coupon_redeemed_at` es la guarda contra el doble uso: se pone SOLO
-- cuando el pago queda `APPROVED` de verdad (webhook de Wompi), nunca
-- al iniciar el checkout — un carrito abandonado no debe quemar el
-- cupón de nadie.
-- ---------------------------------------------------------------------

alter table newsletter
  add column if not exists coupon_expires_at timestamptz,
  add column if not exists coupon_redeemed_at timestamptz,
  add column if not exists coupon_redeemed_order text;

-- Suscriptores de antes de esta migración no tenían fecha de
-- caducidad. Se les da la misma ventana que a los nuevos, contada
-- desde que se dieron de alta (no desde hoy), para no regalarles menos
-- ni más tiempo que a quien se suscribió el mismo día.
update newsletter
set coupon_expires_at = created_at + interval '30 days'
where coupon_expires_at is null;

alter table orders
  add column if not exists coupon_code text,
  add column if not exists discount_in_cents bigint not null default 0;


-- ///////////////////////////////////////////////////////////////////
-- 0007_catalog_snapshot.sql
-- ///////////////////////////////////////////////////////////////////

-- ---------------------------------------------------------------------
-- Última versión del catálogo que ya se anunció por correo.
--
-- La usa `src/lib/catalog-watch.ts`, que corre una vez al día (tarea
-- programada de Cloudflare, ver `wrangler.toml`). Compara el catálogo
-- de código (`products.ts`) contra esta tabla: una prenda con slug que
-- no está aquí es nueva; una con el mismo slug pero precio distinto
-- tuvo un cambio de precio. Cualquiera de los dos casos dispara un
-- correo automático, y esta tabla se actualiza para no volver a
-- avisar de lo mismo al día siguiente.
-- ---------------------------------------------------------------------

create table if not exists catalog_snapshot (
  slug text primary key,
  price integer not null,
  updated_at timestamptz not null default now()
);

alter table catalog_snapshot enable row level security;


-- ///////////////////////////////////////////////////////////////////
-- 0008_launch_reminders.sql
-- ///////////////////////////////////////////////////////////////////

-- ---------------------------------------------------------------------
-- Qué avisos de cuenta regresiva ya se mandaron.
--
-- La usa `src/lib/launch-reminders.ts`, que corre junto al aviso de
-- catálogo (misma tarea programada diaria). Hay tres hitos: 10 días
-- antes, 3 días antes, y el día del lanzamiento (0). Cada fila es "ya
-- se avisó de este hito" — sin esto, el aviso de "faltan 10 días" se
-- repetiría todos los días mientras falten 10 o menos, en vez de
-- salir una sola vez.
-- ---------------------------------------------------------------------

create table if not exists launch_reminders_sent (
  milestone_days integer primary key,
  sent_at timestamptz not null default now()
);

alter table launch_reminders_sent enable row level security;


-- ///////////////////////////////////////////////////////////////////
-- 0009_social_feeds.sql
-- ///////////////////////////////////////////////////////////////////

-- Feeds reales de Instagram y TikTok en el home. Lectura pública (son
-- fotos ya públicas de la marca); escritura solo del servidor.

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

create policy "lectura publica de instagram_posts"
  on instagram_posts for select
  using (true);

create policy "lectura publica de instagram_reels"
  on instagram_reels for select
  using (true);

create policy "lectura publica de tiktok_posts"
  on tiktok_posts for select
  using (true);


-- ///////////////////////////////////////////////////////////////////
-- 0010_contact_messages_message.sql
-- ///////////////////////////////////////////////////////////////////

-- ---------------------------------------------------------------------
-- Agrega el campo de mensaje libre al formulario de contacto: espacio
-- para que la persona describa con sus palabras qué necesita
-- exactamente, y así una sola respuesta ya sea la indicada.
-- ---------------------------------------------------------------------

alter table contact_messages add column if not exists message text;


-- ///////////////////////////////////////////////////////////////////
-- 0011_stock_alerts_snapshot.sql
-- ///////////////////////////////////////////////////////////////////

-- ---------------------------------------------------------------------
-- Última cantidad de stock conocida por producto/variante, para poder
-- avisar cuando cambia (subió = hay disponibilidad; bajó a 1 = queda
-- solo una unidad). La usa `src/lib/stock-alerts.ts`.
-- ---------------------------------------------------------------------

create table if not exists stock_alerts_snapshot (
  key text primary key,
  count integer not null,
  updated_at timestamptz not null default now()
);

alter table stock_alerts_snapshot enable row level security;
