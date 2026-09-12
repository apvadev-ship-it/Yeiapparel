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
