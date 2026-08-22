-- ============================================================
-- Fase comercial del expediente (2026-08-22): roadmap de mejoras, PREM-02
-- ("Cartera de proyectos / pipeline comercial") -- primer paso: una
-- instaladora con equipo comercial necesita ver de un vistazo en qué fase
-- de venta/tramitación está cada expediente sin depender de un CRM aparte.
--
-- Deliberadamente independiente de `estado` (que ya existe: borrador/
-- pendiente/en_revision/aprobado/rechazado y describe el estado
-- ADMINISTRATIVO del trámite). fase_comercial describe el estado COMERCIAL
-- del proyecto -- un expediente puede estar "en_tramitacion" a efectos
-- administrativos durante semanas, que es justo el dato que un kanban de
-- ventas necesita ver, no algo que quepa derivar de `estado` sin perderlo.
--
-- Backfill de las filas existentes a partir de `estado`, no a un valor fijo
-- para todas: un expediente ya aprobado no debería aparecer retrocedido en
-- "clasificado" el día que se despliega esta migración.
-- ============================================================

alter table public.expedientes
  add column if not exists fase_comercial text not null default 'clasificado'
    check (fase_comercial in (
      'prospeccion', 'simulacion_enviada', 'clasificado', 'en_tramitacion', 'aprobado', 'rechazado'
    ));

update public.expedientes set fase_comercial = case estado
  when 'aprobado' then 'aprobado'
  when 'rechazado' then 'rechazado'
  when 'en_revision' then 'en_tramitacion'
  else 'clasificado'
end;

create index if not exists expedientes_fase_comercial_idx
  on public.expedientes (org_id, fase_comercial);
