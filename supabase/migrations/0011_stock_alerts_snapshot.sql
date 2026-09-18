-- ---------------------------------------------------------------------
-- Última cantidad de stock conocida por producto/variante, para poder
-- avisar cuando cambia.
--
-- La usa `src/lib/stock-alerts.ts`, que corre junto al resto de tareas
-- programadas diarias (ver `wrangler.toml` y `src/server.ts`). Compara
-- lo que hoy dice la hoja de disponibilidad (`availability-sheet.ts`)
-- contra la última cantidad guardada aquí:
--   - si subió (por ejemplo de 0 a 5), avisa "hay disponibilidad";
--   - si bajó a exactamente 1, avisa "queda solo 1";
--   - cualquier otro cambio no manda nada, solo actualiza el número.
--
-- `key` es la misma clave que usa `variantKey()` en
-- `src/lib/availability.ts`: el slug solo para stock por producto, o
-- "slug::talla::color" para una variante concreta.
-- ---------------------------------------------------------------------

create table if not exists stock_alerts_snapshot (
  key text primary key,
  count integer not null,
  updated_at timestamptz not null default now()
);

alter table stock_alerts_snapshot enable row level security;
