-- Estadísticas agregadas de plazos reales por trámite, calculadas periódicamente
-- a partir de tramites_estado de todos los expedientes. Nunca contiene datos
-- por organización: es intencionadamente una tabla de solo agregados.
create table if not exists estadisticas_plazos (
  id uuid primary key default gen_random_uuid(),
  comunidad text not null,
  tipo_instalacion text not null,
  -- regla_id si está disponible (expedientes clasificados tras este cambio),
  -- si no, el nombre del trámite normalizado (expedientes anteriores).
  clave_tramite text not null,
  nombre_tramite text not null,
  plazo_legal_dias integer,
  muestra_n integer not null,
  media_real_dias numeric(6,1) not null,
  mediana_real_dias numeric(6,1) not null,
  actualizado_en timestamptz not null default now(),
  unique (comunidad, tipo_instalacion, clave_tramite)
);

comment on table estadisticas_plazos is
  'Solo agregados de lectura. muestra_n < 5 nunca se calcula ni se publica (umbral de privacidad entre organizaciones).';

create index if not exists idx_estadisticas_plazos_lookup
  on estadisticas_plazos (comunidad, tipo_instalacion, clave_tramite);
