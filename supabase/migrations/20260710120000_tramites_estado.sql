-- Seguimiento por trámite dentro de cada expediente.
-- Clave: orden del trámite (string). Valor: { estado, fecha_inicio, fecha_completado }.
alter table expedientes
  add column if not exists tramites_estado jsonb not null default '{}'::jsonb;

comment on column expedientes.tramites_estado is
  'Ej: {"1":{"estado":"en_curso","fecha_inicio":"2026-07-01","fecha_completado":null}}';
