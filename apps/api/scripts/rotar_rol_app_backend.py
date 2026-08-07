"""B-05 (auditoría 2026-08-06), paso (a): genera una contraseña nueva para el
rol de Postgres `app_backend` (creado por
supabase/migrations/20260806120000_rls_aislamiento_multi_tenant.sql) y
muestra los comandos exactos para activarlo.

Este script NO se conecta a ninguna base de datos y NO escribe la
contraseña en ningún fichero: solo la genera e imprime, para que el ALTER
ROLE se ejecute a mano en el SQL Editor de Supabase (o vía `supabase db
execute`) y la nueva DATABASE_URL se guarde directamente como secreto en
Railway/Vercel/donde corresponda. Poner una contraseña de producción en un
fichero del repo (aunque sea en un script) es exactamente el tipo de fuga
que el resto de esta auditoría trató de cerrar (ver B-02).

Uso:
    python apps/api/scripts/rotar_rol_app_backend.py
"""

import secrets
import sys


def generar_password(longitud_bytes: int = 32) -> str:
    return secrets.token_urlsafe(longitud_bytes)


def main() -> None:
    password = generar_password()

    proyecto = "[PROJECT]"
    if len(sys.argv) > 1:
        proyecto = sys.argv[1]

    print("=" * 70)
    print("B-05 paso (a): activar el rol app_backend (sin BYPASSRLS)")
    print("=" * 70)
    print()
    print("1) Ejecuta esto en el SQL Editor de Supabase (o `supabase db execute`):")
    print()
    print(f"   ALTER ROLE app_backend WITH PASSWORD '{password}';")
    print()
    print("   Si el rol todavía no existe, aplica primero la migración")
    print("   supabase/migrations/20260806120000_rls_aislamiento_multi_tenant.sql")
    print("   (la crea con LOGIN pero sin contraseña: no podrá autenticarse hasta")
    print("   este ALTER ROLE).")
    print()
    print("2) Actualiza DATABASE_URL en Railway/Vercel/tu gestor de secretos")
    print("   (NO lo pegues en .env.example ni en ningún fichero versionado):")
    print()
    print(
        f"   postgresql://app_backend:{password}"
        f"@db.{proyecto}.supabase.co:5432/postgres"
    )
    print()
    print("3) Despliega y comprueba:")
    print("   - GET /health responde 200 (la app arranca con el nuevo rol).")
    print("   - Un flujo de chat del asistente completo (verificar_presupuesto +")
    print("     registrar_uso) sigue funcionando: son las únicas tablas RLS que")
    print("     toca este backend hoy (ver servicios/tenant_context.py).")
    print("   - alembic/migraciones futuras: si algún día hace falta DDL,")
    print("     ejecútalo con el rol 'postgres', no con 'app_backend'")
    print("     (app_backend solo tiene SELECT/INSERT/UPDATE/DELETE, sin DDL).")
    print()
    print("Esta contraseña no se ha guardado en ningún sitio por este script.")
    print("Si pierdes este output, vuelve a ejecutar el script para generar otra.")


if __name__ == "__main__":
    main()
