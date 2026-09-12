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
