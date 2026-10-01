-- Payload completo del clasificador con el que se generó el plan del expediente.
-- Antes solo se persistían 12 de ~48 campos y el validador / presupuesto /
-- recálculos reconstruían la clasificación desde una fila incompleta
-- (auditoría 2026-10-01, F-03). Nullable: los expedientes anteriores no lo tienen.
-- Equivalente Alembic: e9a1b2c3d4f5.
alter table public.expedientes
  add column if not exists parametros jsonb;
