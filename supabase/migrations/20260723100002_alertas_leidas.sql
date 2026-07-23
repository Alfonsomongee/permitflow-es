-- Estado de lectura de alertas POR organización. La columna alertas_boe.leida
-- no puede representar el estado de cada tenant en alertas globales (org_id
-- null, compartidas). Se mantiene la columna antigua por compatibilidad, pero
-- la fuente de verdad pasa a ser esta tabla.
create table if not exists alertas_leidas (
  alerta_id uuid not null references alertas_boe(id) on delete cascade,
  org_id uuid not null references organizaciones(id) on delete cascade,
  leida_en timestamptz not null default now(),
  primary key (alerta_id, org_id)
);

create index if not exists idx_alertas_leidas_org on alertas_leidas (org_id);
