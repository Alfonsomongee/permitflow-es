-- ============================================================
-- Portal de cliente bidireccional (2026-08-08): primera pieza -- permitir
-- que el propietario final suba documentación pendiente desde el enlace
-- público (/portal/[token]), por trámite y documento requerido concreto.
--
-- Bucket privado (public=false): solo accesible vía supabaseAdmin
-- (service_role), tanto para subir desde la ruta pública del portal como
-- para generar URLs firmadas de descarga desde el panel del expediente en
-- el dashboard. Límite de 15MB y solo PDF/JPG/PNG, reforzado también a
-- nivel de aplicación en la ruta de subida.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos-cliente',
  'documentos-cliente',
  false,
  15728640,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

create table if not exists public.documentos_cliente (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid not null references public.expedientes(id) on delete cascade,
  tramite_orden int not null,
  documento_id text not null,
  documento_label text not null,
  nombre_original text not null,
  storage_path text not null unique,
  tamano_bytes bigint not null,
  tipo_mime text not null,
  subido_en timestamptz not null default now()
);

create index if not exists documentos_cliente_expediente_idx
  on public.documentos_cliente (expediente_id, tramite_orden);

-- Mismo patrón que el resto de tablas tras B-05: deny-all para anon/
-- authenticated (nadie en la app usa la clave anon -- confirmado en
-- 20260806120000_rls_aislamiento_multi_tenant.sql), acceso real solo vía
-- supabaseAdmin (service_role, exento de RLS) desde las rutas de Next.js.
alter table public.documentos_cliente enable row level security;
alter table public.documentos_cliente force row level security;

drop policy if exists sin_acceso_publico on public.documentos_cliente;
create policy sin_acceso_publico on public.documentos_cliente
  using (false) with check (false);

-- Las tablas nuevas heredan privilegios por defecto a anon/authenticated en
-- este proyecto (visto en todas las tablas anteriores a B-05): revocar
-- explícitamente, incluyendo TRUNCATE (que se salta RLS en Postgres).
revoke all on public.documentos_cliente from anon, authenticated;
