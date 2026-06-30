-- ============================================================
-- Migración: añadir campos al pipeline BOE v2
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Añadir campo diff_sugerido para guardar el diff del LLM
alter table public.alertas_boe
  add column if not exists diff_sugerido jsonb,
  add column if not exists nivel_urgencia text
    check (nivel_urgencia in ('alta', 'media', 'baja'))
    default 'baja',
  add column if not exists fuente text,          -- 'BOE_API_OFICIAL' | 'RSS_BOJA' | etc.
  add column if not exists doc_id text,          -- ID del documento en el BOE/BOJA
  add column if not exists aplicada boolean not null default false,
  add column if not exists aplicada_en timestamptz;

-- 2. Índice para filtrar alertas no leídas rápidamente
create index if not exists alertas_no_leidas_idx
  on public.alertas_boe (leida, nivel_urgencia, creado_en desc);

-- 3. Índice para filtrar por vertical
create index if not exists alertas_verticales_idx
  on public.alertas_boe using gin (verticales_afectados);

-- 4. Vista útil para el panel de alertas del dashboard
create or replace view public.alertas_resumen as
select
  id,
  tipo,
  nivel_urgencia,
  titulo,
  resumen,
  fuente_url,
  ccaa_afectadas,
  verticales_afectados,
  leida,
  aplicada,
  creado_en,
  -- Cuántos días lleva sin leerse
  extract(day from now() - creado_en)::int as dias_pendiente
from public.alertas_boe
order by
  leida asc,
  case nivel_urgencia when 'alta' then 1 when 'media' then 2 else 3 end,
  creado_en desc;

-- 5. Función para marcar alerta como aplicada
create or replace function public.marcar_alerta_aplicada(p_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.alertas_boe
  set aplicada = true,
      aplicada_en = now(),
      leida = true
  where id = p_id;
end;
$$;
