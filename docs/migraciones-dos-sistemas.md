# Dos sistemas de migración sobre una misma base de datos

Descubierto durante la auditoría del 2026-08-23 (AUD-07). No es una propuesta:
es cómo funciona el proyecto hoy. Está escrito porque no estaba escrito en
ningún sitio, y esa ausencia ya ha costado un fallo en producción.

## El reparto

Dos sistemas escriben en la misma base de datos de Supabase:

| | Alembic | Supabase SQL |
|---|---|---|
| Dónde | `apps/api/alembic/versions/*.py` | `supabase/migrations/*.sql` |
| Registro | `alembic_version` | `supabase_migrations.schema_migrations` |
| Cómo se aplica | `alembic upgrade head` en el despliegue del backend | **a mano** |
| Estado (2026-08-23) | 11 revisiones, producción en head | 13 ficheros, historial irregular |

**Tablas de Alembic** (tienen modelo SQLAlchemy en `apps/api/models/`):
`analisis_facturas`, `asistente_conversaciones`, `asistente_mensajes`,
`asistente_reportes`, `asistente_uso`, `catalogo_componentes`,
`estudios_energeticos`, `expedientes`, `idoneidad_cache`,
`newsletter_suscriptores`, `organizaciones`.

**Tablas de Supabase SQL**: `alertas_boe`, `alertas_leidas`,
`documentos_cliente`, `estadisticas_plazos`, `historial_tramites`,
`notificaciones`, `subsanaciones`.

## Por qué se pierde siempre la mitad de Supabase

Alembic se aplica solo y deja registro. Las migraciones de Supabase se aplican
a mano desde el editor SQL del panel, que **no escribe** en
`schema_migrations`. De ahí que el registro y el repo divergieran hasta el
punto de que `estadisticas_plazos` llevara desde julio sin existir en
producción sin que nadie lo notara.

No es casualidad que las dos migraciones perdidas fueran de Supabase y ninguna
de Alembic.

## La frontera se cruza, y a veces está bien

Las políticas de RLS de tablas gobernadas por Alembic viven en migraciones de
Supabase (`20260806120000`, `20260808080130`, `20260823100000`). Es
razonable: Alembic no maneja RLS con comodidad.

Lo que **no** está bien es añadir columnas a una tabla de Alembic desde una
migración de Supabase. Hay un caso vivo:

> `20260822090000_fase_comercial.sql` añade `fase_comercial` a `expedientes`,
> que es tabla de Alembic. Si alguien ejecuta
> `alembic revision --autogenerate`, Alembic comparará los modelos con la base
> de datos, verá una columna que ningún modelo declara y generará un
> `DROP COLUMN fase_comercial`.

Riesgo real y silencioso. Se corrige de una de estas dos formas:

1. Declarar `fase_comercial` en el modelo SQLAlchemy de `expedientes` y crear
   una revisión de Alembic vacía que la marque como ya aplicada, o
2. Mover la columna a una revisión de Alembic y retirar el `alter table` de la
   migración de Supabase.

Pendiente de decidir. Mientras tanto: **no ejecutar `--autogenerate` sin
revisar el diff a mano.**

## Reglas

1. **Tabla con modelo SQLAlchemy → Alembic.** Columnas, índices y constraints
   se tocan desde Alembic, nunca desde `supabase/migrations/`.
2. **Tabla sin modelo → Supabase SQL.**
3. **RLS, políticas, grants y funciones → Supabase SQL**, aunque la tabla sea
   de Alembic.
4. **Al aplicar una migración de Supabase a mano, registrarla después:**

   ```sql
   insert into supabase_migrations.schema_migrations (version, name)
   values ('20260823100000', 'rls_organizaciones_newsletter')
   on conflict (version) do nothing;
   ```

   Sin este paso el detector de deriva la dará por no aplicada. Mejor aún:
   aplicarla con `supabase db push`, que registra sola.
5. **Antes de `alembic revision --autogenerate`**, leer el diff generado. Puede
   proponer borrar objetos creados desde el otro sistema.

## Comprobación

`apps/api/scripts/check_migration_drift.py` vigila los dos sistemas: que
Alembic esté en head y sin cadena bifurcada, y que el repo y el registro de
Supabase coincidan. Corre a diario de lunes a viernes
(`.github/workflows/migration_drift.yml`) y avisa por email si falla.

La deriva heredada está declarada en `supabase/migrations-baseline.txt`, con el
motivo de cada línea. El chequeo solo falla ante deriva **nueva**.
