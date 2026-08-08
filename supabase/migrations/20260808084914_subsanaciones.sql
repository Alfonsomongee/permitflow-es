-- ============================================================
-- Requerimientos de subsanación (2026-08-08): sección 2 del brainstorming
-- ("Colaboración y ejecución") -- "Registrar requerimientos de subsanación
-- de la distribuidora/ayuntamiento como eventos estructurados del timeline
-- (con plazo y alertas), en vez de notas libres -- es la causa nº1 de
-- retraso y hoy queda fuera de la herramienta."
--
-- Hoy lo único que existe para esto es el campo de texto libre
-- expedientes.notas, sin plazo ni asociación a un trámite concreto.
--
-- fecha_limite se calcula en el servidor con calcularVencimientoHabil
-- (lib/festivos.ts), la misma lógica de días hábiles por CCAA que ya usa
-- lib/plazos.ts para el plazo legal del propio trámite -- son dos plazos
-- independientes (el de subsanación es más corto y no debe pisar
-- tramites_estado.fecha_inicio, que sigue siendo la fecha de presentación).
--
-- Mismo patrón que documentos_cliente/RLS de hoy: deny-all para
-- anon/authenticated, acceso real solo vía supabaseAdmin (service_role)
-- desde las rutas de Next.js.
-- ============================================================

create table if not exists public.subsanaciones (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid not null references public.expedientes(id) on delete cascade,
  org_id uuid not null references public.organizaciones(id) on delete cascade,
  tramite_orden int not null,
  tramite_nombre text not null,
  descripcion text not null,
  plazo_dias int not null,
  fecha_inicio date not null,
  fecha_limite date not null,
  resuelta boolean not null default false,
  resuelta_en timestamptz,
  creado_por text not null,
  creado_en timestamptz not null default now()
);

create index if not exists subsanaciones_expediente_idx
  on public.subsanaciones (expediente_id, resuelta);

alter table public.subsanaciones enable row level security;
alter table public.subsanaciones force row level security;

drop policy if exists sin_acceso_publico on public.subsanaciones;
create policy sin_acceso_publico on public.subsanaciones
  using (false) with check (false);

revoke all on public.subsanaciones from anon, authenticated;
