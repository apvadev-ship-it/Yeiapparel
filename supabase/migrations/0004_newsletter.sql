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
