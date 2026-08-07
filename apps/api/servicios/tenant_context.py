"""Contexto de tenant para RLS (auditoría 2026-08-06, B-05 paso b).

Resuelve el org_id interno a partir del header X-Org-Id (inyectado por
Next.js desde la sesión de Clerk) y lo fija como GUC de sesión de Postgres
(`app.current_org_id`, ámbito de TRANSACCIÓN vía `SET LOCAL`/`set_config`)
para que las políticas de
supabase/migrations/20260806120000_rls_aislamiento_multi_tenant.sql puedan
aplicarse.

IMPORTANTE — esto por sí solo NO activa la protección:
DATABASE_URL debe apuntar al rol `app_backend` (sin BYPASSRLS) en vez del
rol `postgres` (superusuario, ignora RLS siempre). Ver
apps/api/scripts/rotar_rol_app_backend.py para generar la contraseña de ese
rol y las instrucciones de despliegue. Mientras DATABASE_URL siga usando
`postgres`, este módulo fija el GUC correctamente pero Postgres lo ignora
a efectos de RLS (comportamiento sin cambios, no rompe nada).

Alcance actual: la única tabla protegida por RLS que el backend FastAPI
realmente lee/escribe hoy es `asistente_uso` (vía servicios/asistente_presupuesto.py)
y, en lectura, `expedientes` (para construir el contexto del asistente).
`asistente_conversaciones`, `asistente_mensajes` y `asistente_reportes`
tienen modelo pero ningún endpoint las usa todavía (funcionalidad de
historial de chat sin implementar) — se dejan cubiertas igualmente para que
hereden protección en cuanto se implementen.

`expedientes` como tabla de escritura, `historial_tramites`, `alertas_boe`,
`alertas_leidas` y `notificaciones` se gestionan desde apps/web con la
service_role key de Supabase (PostgREST), NO desde este backend — este
módulo no las alcanza. Ver el hallazgo correspondiente en la auditoría.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.organizacion import Organizacion


@dataclass
class TenantContext:
    """Sesión de base de datos ya vinculada a una organización resuelta."""

    session: AsyncSession
    organizacion: Organizacion

    @property
    def org_id(self) -> uuid.UUID:
        return self.organizacion.id


async def set_tenant_context(session: AsyncSession, org_id: uuid.UUID) -> None:
    """Fija app.current_org_id en la sesión/transacción dada.

    Usa `set_config(..., is_local=true)` en vez de interpolar `SET LOCAL`
    como texto: set_config acepta el valor como parámetro normal (evita
    problemas de escapado) y el tercer argumento `true` le da el mismo
    alcance de transacción que `SET LOCAL` (se revierte automáticamente al
    hacer commit/rollback, no contamina conexiones reutilizadas del pool).

    Debe llamarse ANTES de cualquier otra query sobre tablas con RLS en esa
    misma sesión/transacción.
    """
    await session.execute(
        text("SELECT set_config('app.current_org_id', :org_id, true)"),
        {"org_id": str(org_id)},
    )


async def resolver_organizacion(session: AsyncSession, clerk_org_id: str) -> Organizacion:
    """Busca la organización interna a partir del clerk_org_id.

    Esta query en sí NO requiere el GUC de tenant: la tabla `organizaciones`
    queda deliberadamente fuera de RLS (ver cabecera de la migración) porque
    resolver el org_id interno es, por definición, el paso previo a poder
    fijarlo.
    """
    result = await session.execute(
        select(Organizacion).where(Organizacion.clerk_org_id == clerk_org_id)
    )
    organizacion = result.scalars().first()
    if not organizacion:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organización no encontrada o sin acceso",
        )
    return organizacion


async def get_tenant_context(
    session: AsyncSession = Depends(get_db),
    x_org_id: Optional[str] = Header(default=None),
) -> TenantContext:
    """Dependencia de FastAPI: resuelve la organización y fija el contexto
    de tenant en la sesión antes de devolverla.

    Sustituye a `Depends(get_db)` en cualquier endpoint que consulte tablas
    protegidas por RLS.
    """
    if not x_org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Header X-Org-Id requerido",
        )

    organizacion = await resolver_organizacion(session, x_org_id)
    await set_tenant_context(session, organizacion.id)
    return TenantContext(session=session, organizacion=organizacion)
