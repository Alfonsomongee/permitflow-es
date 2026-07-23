-- ============================================================
-- Migración de sincronización: consolida en el repo todos los
-- cambios aplicados a mano en el SQL Editor (Bloques 6 y fixes).
-- Todas las operaciones son idempotentes: seguro re-ejecutar.
-- ============================================================

-- Fix de defaults ausentes en la creación original de la tabla
-- (causa del error "null value in column creado_en").
alter table expedientes alter column creado_en set default now();
alter table expedientes alter column actualizado_en set default now();

-- Control de concurrencia optimista (Bloque 6 / CAS).
alter table expedientes add column if not exists version integer not null default 0;

-- Auditoría append-only de cambios de estado por trámite (Bloque 6).
create table if not exists historial_tramites (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid not null references expedientes(id) on delete cascade,
  orden integer not null,
  estado_anterior text,
  estado_nuevo text not null,
  operador_id text not null,
  creado_en timestamptz not null default now()
);

create index if not exists idx_historial_tramites_expediente
  on historial_tramites (expediente_id, creado_en desc);
