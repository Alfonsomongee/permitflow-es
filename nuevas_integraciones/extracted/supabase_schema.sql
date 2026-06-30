-- ============================================================
-- PermitFlow ES — Schema Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- Extensión para UUIDs
create extension if not exists "uuid-ossp";

-- ─── Tabla de organizaciones (multi-tenant) ───────────────────────────────────
-- Una organización = una empresa cliente (instaladora, gestoría…)
-- El clerk_org_id enlaza con la organización de Clerk

create table if not exists public.organizaciones (
  id            uuid primary key default uuid_generate_v4(),
  clerk_org_id  text unique not null,
  nombre        text not null,
  plan          text not null default 'free' check (plan in ('free', 'pro', 'enterprise')),
  stripe_customer_id   text,
  stripe_subscription_id text,
  stripe_price_id      text,
  suscripcion_activa   boolean not null default false,
  suscripcion_fin      timestamptz,
  creado_en     timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- ─── Tabla de expedientes ─────────────────────────────────────────────────────
create table if not exists public.expedientes (
  id                    uuid primary key default uuid_generate_v4(),
  org_id                uuid not null references public.organizaciones(id) on delete cascade,
  clerk_user_id         text not null,                         -- quien lo creó
  tipo_instalacion      text not null,
  comunidad             text not null,
  municipio             text not null default '',
  potencia_kw           numeric not null,
  uso                   text not null default 'residencial',
  -- Campos opcionales por vertical
  numero_puntos         int,
  modo_recarga          text,
  acceso_publico        boolean,
  ubicacion_irve        text,
  requiere_nuevo_suministro boolean,
  combustible           text,
  presion_bar           text,
  solicita_ayuda        boolean default false,
  -- Resultado del motor normativo (guardado como JSONB)
  plan_tramitacion      jsonb,
  tiempo_total_dias     int,
  -- Estado del expediente
  estado                text not null default 'borrador'
                        check (estado in ('borrador','pendiente','en_revision','aprobado','rechazado')),
  tramites_completados  int not null default 0,
  -- Metadata
  referencia_cliente    text,
  notas                 text,
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now()
);

-- ─── Tabla de alertas BOE ────────────────────────────────────────────────────
create table if not exists public.alertas_boe (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid references public.organizaciones(id) on delete cascade,
  tipo            text not null check (tipo in ('normativa_nueva','modificacion','derogacion')),
  titulo          text not null,
  resumen         text,
  fuente_url      text,
  ccaa_afectadas  text[],
  verticales_afectados text[],
  leida           boolean not null default false,
  creado_en       timestamptz not null default now()
);

-- ─── Índices ──────────────────────────────────────────────────────────────────
create index if not exists expedientes_org_idx on public.expedientes(org_id);
create index if not exists expedientes_user_idx on public.expedientes(clerk_user_id);
create index if not exists expedientes_estado_idx on public.expedientes(estado);
create index if not exists alertas_org_idx on public.alertas_boe(org_id);

-- ─── Trigger updated_at automático ───────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

create trigger expedientes_updated_at
  before update on public.expedientes
  for each row execute function public.set_updated_at();

create trigger organizaciones_updated_at
  before update on public.organizaciones
  for each row execute function public.set_updated_at();

-- ─── Row Level Security (RLS) ─────────────────────────────────────────────────
-- Los usuarios solo ven datos de su propia organización

alter table public.organizaciones enable row level security;
alter table public.expedientes enable row level security;
alter table public.alertas_boe enable row level security;

-- Política: la app accede con service_role (bypass RLS desde el servidor)
-- Las políticas RLS son para acceso directo desde el cliente (si se usa)

create policy "org_isolation_expedientes"
  on public.expedientes
  using (
    org_id in (
      select id from public.organizaciones
      where clerk_org_id = current_setting('app.current_org_id', true)
    )
  );

create policy "org_isolation_alertas"
  on public.alertas_boe
  using (
    org_id in (
      select id from public.organizaciones
      where clerk_org_id = current_setting('app.current_org_id', true)
    )
  );

-- ─── Función helper: upsert de organización desde webhook Clerk ───────────────
create or replace function public.upsert_organizacion(
  p_clerk_org_id text,
  p_nombre text
) returns uuid language plpgsql security definer as $$
declare
  v_id uuid;
begin
  insert into public.organizaciones (clerk_org_id, nombre)
  values (p_clerk_org_id, p_nombre)
  on conflict (clerk_org_id) do update
    set nombre = excluded.nombre,
        actualizado_en = now()
  returning id into v_id;
  return v_id;
end;
$$;
