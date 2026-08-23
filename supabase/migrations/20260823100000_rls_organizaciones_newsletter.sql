-- Cierra los dos huecos de RLS que quedaron fuera de las migraciones
-- 20260806120000_rls_aislamiento_multi_tenant.sql y
-- 20260808080130_rls_tablas_restantes_y_limpieza_grants.sql.
--
-- Verificado contra producción el 2026-08-23 (Supabase advisors, nivel ERROR):
--
--   newsletter_suscriptores : RLS=false y anon con SELECT/INSERT/UPDATE/
--                             DELETE/TRUNCATE. La anon key viaja en el bundle
--                             del navegador (NEXT_PUBLIC_SUPABASE_ANON_KEY),
--                             así que cualquiera podía leer la lista completa
--                             de correos (dato personal, RGPD) y además
--                             borrarla o truncarla. 0 filas hoy: el agujero
--                             es real pero todavía no se ha filtrado nada.
--
--   organizaciones          : RLS=false y anon con SELECT. Exponía nombre,
--                             plan, suscripcion_activa y clerk_org_id de
--                             todos los clientes. Solo lectura: NO permitía
--                             activar Pro gratis (no hay grant de UPDATE).
--
-- Seguro de aplicar: ninguna ruta de la aplicación usa el cliente anónimo.
-- `supabaseClient` se declara en apps/web/lib/supabase.ts y no se importa en
-- ningún sitio; todo el acceso real va por `supabaseAdmin` (service_role, que
-- salta RLS por diseño) o por el backend FastAPI con la misma clave. Activar
-- RLS sin políticas deja estas tablas en "denegar todo" para anon/authenticated
-- sin tocar el funcionamiento actual.

alter table public.organizaciones          enable row level security;
alter table public.newsletter_suscriptores enable row level security;

-- Defensa en profundidad: aunque RLS ya bloquea, retiramos los permisos que
-- nunca debieron concederse. Si algún día se usa la anon key, el fallo será
-- "permission denied" y no una fuga silenciosa.
revoke all on public.newsletter_suscriptores from anon, authenticated;
revoke all on public.organizaciones          from anon, authenticated;

-- La migración 20260808080208_revocar_execute_marcar_alerta_aplicada.sql ya
-- hacía esto, pero producción sigue permitiendo la llamada vía
-- /rest/v1/rpc/marcar_alerta_aplicada (advisor 0028/0029 el 2026-08-23):
-- señal de que aquella migración nunca llegó a aplicarse. Se reafirma aquí de
-- forma idempotente.
revoke execute on function public.marcar_alerta_aplicada(uuid) from anon, authenticated;

-- search_path mutable en funciones SECURITY DEFINER (advisors 0011): sin
-- fijarlo, quien pueda crear objetos en un esquema del search_path podría
-- alterar a qué resuelven los nombres sin cualificar dentro de la función.
alter function public.app_current_org_id()            set search_path = public, pg_temp;
alter function public.marcar_alerta_aplicada(uuid)    set search_path = public, pg_temp;
