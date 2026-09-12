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
