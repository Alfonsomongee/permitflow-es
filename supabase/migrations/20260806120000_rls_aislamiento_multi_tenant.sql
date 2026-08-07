-- ============================================================
-- B-05 (auditoría 2026-08-06): Row Level Security de defensa en profundidad
-- para las tablas multi-tenant.
--
-- ADVERTENCIA IMPORTANTE — LEER ANTES DE ASUMIR QUE ESTO "ARREGLA" EL AISLAMIENTO:
--
-- Esta migración NO añade ninguna protección efectiva mientras las dos vías
-- de acceso actuales sigan como están:
--   1. apps/api (FastAPI) se conecta con DATABASE_URL usando el rol `postgres`
--      (ver apps/api/database.py + .env.example: "postgresql://postgres:...").
--      El propietario de las tablas y los superusuarios de Postgres SIEMPRE
--      saltan RLS, tenga o no FORCE ROW LEVEL SECURITY. Esto no es un bug de
--      esta migración: es el comportamiento documentado de Postgres.
--   2. apps/web (Next.js) usa SUPABASE_SERVICE_ROLE_KEY (`supabaseAdmin` en
--      apps/web/lib/supabase.ts). El service_role de Supabase está diseñado
--      explícitamente para saltar RLS vía PostgREST.
--
-- Es decir: hoy, el 100% del tráfico real pasa por roles que ignoran estas
-- políticas. El aislamiento sigue siendo enteramente responsabilidad del
-- filtro `WHERE org_id = ...` en cada query de la aplicación (que la
-- auditoría de apps/web y apps/api no encontró roto en ningún sitio, pero
-- que no tiene red de seguridad si alguien lo olvida en el futuro).
--
-- Para que estas políticas empiecen a proteger de verdad hacen falta DOS
-- pasos adicionales, deliberadamente NO incluidos en esta migración porque
-- son cambios de infraestructura/despliegue, no de esquema:
--   (a) Crear un rol de aplicación sin BYPASSRLS (ver más abajo, ya creado
--       aquí como `app_backend`) y migrar DATABASE_URL a ese rol en vez de
--       `postgres`.
--   (b) Añadir, en cada request de FastAPI que toque estas tablas, un
--       `SET LOCAL app.current_org_id = '<uuid>'` con el org_id ya resuelto
--       desde el header de Clerk (antes de ejecutar cualquier query de la
--       tabla). Sin esto, current_org_id() devuelve NULL y las políticas
--       deniegan todo (fail-closed, no fail-open: mejor un 500 que una fuga).
--
-- Hasta que (a) y (b) se hagan, esta migración es inerte por diseño: no
-- rompe nada (todo sigue pasando por roles que bypassean RLS) pero deja la
-- infraestructura lista para activarse sin otra migración.
-- ============================================================

-- ─── Rol de aplicación de bajo privilegio (para uso futuro, ver (a) arriba) ──
-- No tiene BYPASSRLS ni es superusuario: a diferencia de `postgres`, si algún
-- día DATABASE_URL usa este rol, las políticas de abajo sí se aplicarán.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_backend') then
    create role app_backend with login nosuperuser nocreatedb nocreaterole nobypassrls;
  end if;
end
$$;

grant usage on schema public to app_backend;
grant select, insert, update, delete on
  organizaciones,
  expedientes,
  historial_tramites,
  alertas_boe,
  alertas_leidas,
  notificaciones,
  asistente_uso,
  asistente_conversaciones,
  asistente_mensajes,
  asistente_reportes
to app_backend;

-- ─── Función auxiliar: org_id de la sesión actual ────────────────────────────
-- Devuelve NULL si nadie ha hecho SET LOCAL app.current_org_id, lo que hace
-- que todas las políticas de abajo denieguen el acceso por defecto
-- (fail-closed) en vez de exponer filas de otra organización por omisión.
create or replace function app_current_org_id() returns uuid
language sql stable as $$
  select nullif(current_setting('app.current_org_id', true), '')::uuid;
$$;

-- ─── expedientes ──────────────────────────────────────────────────────────
alter table expedientes enable row level security;
alter table expedientes force row level security;

drop policy if exists tenant_isolation on expedientes;
create policy tenant_isolation on expedientes
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());

-- ─── historial_tramites (sin org_id propio; hereda vía expediente_id) ───────
alter table historial_tramites enable row level security;
alter table historial_tramites force row level security;

drop policy if exists tenant_isolation on historial_tramites;
create policy tenant_isolation on historial_tramites
  using (
    exists (
      select 1 from expedientes e
      where e.id = historial_tramites.expediente_id
        and e.org_id = app_current_org_id()
    )
  )
  with check (
    exists (
      select 1 from expedientes e
      where e.id = historial_tramites.expediente_id
        and e.org_id = app_current_org_id()
    )
  );

-- ─── alertas_boe (parcialmente global: org_id NULL = compartida) ───────────
-- No se restringe la lectura (las alertas globales deben verlas todos los
-- tenants), solo la escritura: solo el pipeline (que usa service_role,
-- exento de RLS) debe poder insertar/modificar.
alter table alertas_boe enable row level security;
alter table alertas_boe force row level security;

drop policy if exists lectura_global_y_propia on alertas_boe;
create policy lectura_global_y_propia on alertas_boe
  for select
  using (org_id is null or org_id = app_current_org_id());

drop policy if exists escritura_solo_propia on alertas_boe;
create policy escritura_solo_propia on alertas_boe
  for insert
  with check (org_id = app_current_org_id());

drop policy if exists actualizacion_solo_propia on alertas_boe;
create policy actualizacion_solo_propia on alertas_boe
  for update
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());

-- ─── alertas_leidas ──────────────────────────────────────────────────────
alter table alertas_leidas enable row level security;
alter table alertas_leidas force row level security;

drop policy if exists tenant_isolation on alertas_leidas;
create policy tenant_isolation on alertas_leidas
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());

-- ─── notificaciones ──────────────────────────────────────────────────────
alter table notificaciones enable row level security;
alter table notificaciones force row level security;

drop policy if exists tenant_isolation on notificaciones;
create policy tenant_isolation on notificaciones
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());

-- ─── asistente_uso / asistente_conversaciones / asistente_reportes ─────────
alter table asistente_uso enable row level security;
alter table asistente_uso force row level security;
drop policy if exists tenant_isolation on asistente_uso;
create policy tenant_isolation on asistente_uso
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());

alter table asistente_conversaciones enable row level security;
alter table asistente_conversaciones force row level security;
drop policy if exists tenant_isolation on asistente_conversaciones;
create policy tenant_isolation on asistente_conversaciones
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());

alter table asistente_reportes enable row level security;
alter table asistente_reportes force row level security;
drop policy if exists tenant_isolation on asistente_reportes;
create policy tenant_isolation on asistente_reportes
  using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());

-- ─── asistente_mensajes (sin org_id propio; hereda vía conversacion_id) ────
alter table asistente_mensajes enable row level security;
alter table asistente_mensajes force row level security;

drop policy if exists tenant_isolation on asistente_mensajes;
create policy tenant_isolation on asistente_mensajes
  using (
    exists (
      select 1 from asistente_conversaciones c
      where c.id = asistente_mensajes.conversacion_id
        and c.org_id = app_current_org_id()
    )
  )
  with check (
    exists (
      select 1 from asistente_conversaciones c
      where c.id = asistente_mensajes.conversacion_id
        and c.org_id = app_current_org_id()
    )
  );

-- ─── organizaciones: deliberadamente SIN política restrictiva ──────────────
-- Motivo: para resolver el org_id interno a partir de clerk_org_id (primer
-- paso de casi cualquier request) hace falta consultar esta tabla ANTES de
-- conocer el org_id de sesión — no se puede aplicar la misma política sin
-- crear un problema del huevo y la gallina. La tabla solo expone
-- id/clerk_org_id/nombre (sin datos de negocio), así que el riesgo de dejarla
-- fuera de RLS es bajo. Revisar si en el futuro se añaden columnas sensibles.
--
-- alertas_boe.leida (columna heredada, ver 20260723100002_alertas_leidas.sql)
-- y catalogo_componentes/estadisticas_plazos/idoneidad_cache no llevan RLS:
-- son datos globales o agregados sin distinción por organización, documentado
-- así explícitamente en sus propias migraciones/modelos.
