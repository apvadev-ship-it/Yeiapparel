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
