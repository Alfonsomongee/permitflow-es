"""Autenticación interna del motor.

El gate de monetización (plan Pro) y la autenticación de usuarios (Clerk)
viven en Next.js. Sin esta verificación, cualquier cliente con la URL
pública de FastAPI puede clasificar, validar y generar documentos gratis.

Se usa una clave compartida en la cabecera X-Internal-Key, comparada en
tiempo constante (secrets.compare_digest) para evitar timing attacks.
"""
import logging
import secrets
from typing import Optional

from fastapi import Header, HTTPException, status

from config import settings

logger = logging.getLogger(__name__)


async def verificar_clave_interna(
    x_internal_key: Optional[str] = Header(default=None),
) -> None:
    clave = settings.INTERNAL_API_KEY

    if not clave:
        if settings.ENVIRONMENT == "development":
            # Comodidad en local: no bloquea, pero deja rastro para no olvidarlo.
            logger.warning(
                "INTERNAL_API_KEY no configurada: endpoints abiertos (solo development)"
            )
            return
        # Fail-fast en producción: mejor 503 explícito que un motor abierto.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="INTERNAL_API_KEY no configurada en el servidor",
        )

    if not x_internal_key or not secrets.compare_digest(x_internal_key, clave):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Clave interna inválida",
        )
