from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.asistente import AsistenteUso
from sqlalchemy.dialects.postgresql import insert
import uuid
from datetime import date
from fastapi import HTTPException, status

# Límites diarios hardcodeados por ahora (en el futuro vendrían del plan Pro)
LIMITE_MENSAJES_DIARIOS = 100
LIMITE_TOKENS_DIARIOS = 500000

async def verificar_presupuesto(org_id: uuid.UUID, session: AsyncSession) -> None:
    """Verifica si la organización ha excedido su presupuesto diario de IA."""
    stmt = select(AsistenteUso).where(
        AsistenteUso.org_id == org_id,
        AsistenteUso.fecha == date.today()
    )
    result = await session.execute(stmt)
    uso = result.scalars().first()
    
    if uso:
        if uso.mensajes >= LIMITE_MENSAJES_DIARIOS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Límite diario de mensajes de asistente alcanzado."
            )
        if uso.tokens_entrada + uso.tokens_salida >= LIMITE_TOKENS_DIARIOS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Límite diario de tokens de asistente alcanzado."
            )

async def registrar_uso(
    org_id: uuid.UUID,
    session: AsyncSession,
    tokens_entrada: int,
    tokens_entrada_cache: int,
    tokens_salida: int,
) -> None:
    """Incrementa atómicamente los contadores de uso."""
    # Usamos INSERT ... ON CONFLICT DO UPDATE para evitar race conditions
    stmt = insert(AsistenteUso).values(
        org_id=org_id,
        fecha=date.today(),
        mensajes=1,
        tokens_entrada=tokens_entrada,
        tokens_entrada_cache=tokens_entrada_cache,
        tokens_salida=tokens_salida
    ).on_conflict_do_update(
        index_elements=['org_id', 'fecha'],
        set_={
            'mensajes': AsistenteUso.mensajes + 1,
            'tokens_entrada': AsistenteUso.tokens_entrada + tokens_entrada,
            'tokens_entrada_cache': AsistenteUso.tokens_entrada_cache + tokens_entrada_cache,
            'tokens_salida': AsistenteUso.tokens_salida + tokens_salida,
        }
    )
    
    await session.execute(stmt)
    await session.commit()
