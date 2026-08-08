-- ============================================================
-- Continuación de 20260806120000_rls_aislamiento_multi_tenant.sql: al
-- aplicar esa migración y revisar el linter de seguridad de Supabase
-- (2026-08-08), aparecieron 5 tablas más sin RLS que no estaban en el
-- alcance original de B-05:
--   - analisis_facturas / estudios_energeticos: datos del simulador
--     financiero (consumo energético ligado a un hash de CUPS, resultado de
--     la simulación de ahorro) -- sensibles, sin columna de organización.
--   - catalogo_componentes / idoneidad_cache: verdaderamente globales
--     (catálogo de precios, caché de PVGIS por coordenadas), ya
--     documentados como tal en migraciones previas, pero sin RLS activado
--     formalmente.
--   - alembic_version: bookkeeping interno de Alembic, una fila, sin datos
--     de negocio.
--
-- Se confirmó por búsqueda en todo el repo que `supabaseClient` (el cliente
-- Supabase con la clave anon, pensado para uso en navegador,
-- apps/web/lib/supabase.ts) no se importa en ningún sitio de apps/web ni
-- apps/api -- ni siquiera el portal de cliente público (/portal/[token])
-- lo usa, pasa por supabaseAdmin en el servidor. Es decir: los roles
-- anon/authenticated no tienen ningún caso de uso legítimo en esta app hoy.
-- Se revoca todo acceso de escritura sobre las 5 tablas restantes y se
-- retiran privilegios residuales (TRUNCATE/TRIGGER/REFERENCES) heredados de
-- una concesión "grant all" original en las tablas ya protegidas por la
-- migración anterior.
-- ============================================================

-- analisis_facturas: sin columna de organización -- deny-all para anon/
-- authenticated. La app solo la escribe/lee vía supabaseAdmin.
alter table analisis_facturas enable row level security;
alter table analisis_facturas force row level security;
drop policy if exists sin_acceso_publico on analisis_facturas;
create policy sin_acceso_publico on analisis_facturas
  using (false) with check (false);

-- estudios_energeticos: idem.
alter table estudios_energeticos enable row level security;
alter table estudios_energeticos force row level security;
drop policy if exists sin_acceso_publico on estudios_energeticos;
create policy sin_acceso_publico on estudios_energeticos
  using (false) with check (false);

-- catalogo_componentes: global real, sin datos sensibles -- lectura
-- abierta, escritura solo desde roles que bypassan RLS.
alter table catalogo_componentes enable row level security;
alter table catalogo_componentes force row level security;
drop policy if exists lectura_global on catalogo_componentes;
create policy lectura_global on catalogo_componentes for select using (true);
drop policy if exists sin_escritura_publica on catalogo_componentes;
create policy sin_escritura_publica on catalogo_componentes for insert with check (false);
drop policy if exists sin_actualizacion_publica on catalogo_componentes;
create policy sin_actualizacion_publica on catalogo_componentes for update using (false);
drop policy if exists sin_borrado_publico on catalogo_componentes;
create policy sin_borrado_publico on catalogo_componentes for delete using (false);

-- idoneidad_cache: caché PVGIS por coordenadas, global, sin datos
-- sensibles.
alter table idoneidad_cache enable row level security;
alter table idoneidad_cache force row level security;
drop policy if exists lectura_global on idoneidad_cache;
create policy lectura_global on idoneidad_cache for select using (true);
drop policy if exists sin_escritura_publica on idoneidad_cache;
create policy sin_escritura_publica on idoneidad_cache for insert with check (false);
drop policy if exists sin_actualizacion_publica on idoneidad_cache;
create policy sin_actualizacion_publica on idoneidad_cache for update using (false);
drop policy if exists sin_borrado_publico on idoneidad_cache;
create policy sin_borrado_publico on idoneidad_cache for delete using (false);

-- alembic_version: bookkeeping interno, una fila, sin datos de negocio.
alter table alembic_version enable row level security;
alter table alembic_version force row level security;
drop policy if exists sin_acceso_publico on alembic_version;
create policy sin_acceso_publico on alembic_version using (false) with check (false);

-- Limpieza: retirar privilegios residuales (TRUNCATE/TRIGGER/REFERENCES) de
-- anon/authenticated sobre las tablas ya protegidas por la migración
-- anterior. TRUNCATE en particular puede saltarse RLS en Postgres, así que
-- no basta con las políticas de fila si el grant de tabla sigue ahí.
revoke truncate, trigger, references on
  organizaciones, expedientes, historial_tramites, alertas_boe, alertas_leidas,
  notificaciones, asistente_uso, asistente_conversaciones, asistente_mensajes,
  asistente_reportes, analisis_facturas, estudios_energeticos,
  catalogo_componentes, idoneidad_cache, alembic_version
from anon, authenticated;
