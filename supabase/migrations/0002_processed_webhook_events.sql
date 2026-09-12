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
