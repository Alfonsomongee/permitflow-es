-- ============================================================
-- Migración: notificaciones proactivas de plazos + portal de cliente final
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Notificaciones de plazos: generadas por el cron
--    apps/web/app/api/cron/notificaciones-plazos, a partir de
--    lib/notificaciones.ts::calcularNotificacionesPlazos.
--    Antes de esto, la campana del topbar (DashboardTopbar.tsx) era
--    puramente decorativa: mostraba un punto rojo fijo sin datos reales.
create table if not exists public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizaciones(id) on delete cascade,
  expediente_id uuid not null references public.expedientes(id) on delete cascade,
  tramite_orden int not null,
  tipo text not null check (tipo in ('plazo_proximo', 'plazo_vencido')),
  dias_restantes int not null,
  mensaje text not null,
  leida boolean not null default false,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (expediente_id, tramite_orden, tipo)
);

create index if not exists notificaciones_org_no_leidas_idx
  on public.notificaciones (org_id, leida, creado_en desc);

-- 2. Portal de cliente final: enlace de solo lectura sin necesidad de cuenta.
--    Token opaco (UUID aleatorio), revocable regenerándolo. No lleva fecha de
--    expiración deliberadamente: el caso de uso es "seguimiento durante toda
--    la tramitación", pero es una mejora futura razonable añadir un TTL.
alter table public.expedientes
  add column if not exists share_token uuid unique;

create index if not exists expedientes_share_token_idx
  on public.expedientes (share_token);
