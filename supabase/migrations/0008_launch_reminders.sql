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
