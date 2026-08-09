"""Endpoint público de suscripción a la newsletter (alertas del BOE).

Cierra el hueco de Footer.tsx (D-11, auditoría 2026-08-06): el formulario
de "Recibe alertas del BOE" existía en la landing pero deshabilitado,
porque no había backend que guardara el email. Este router solo persiste
la suscripción en `newsletter_suscriptores`.

Alcance explícitamente NO incluido aquí: el envío periódico de alertas del
BOE a estos emails. Eso requiere una plantilla de email, una cadencia de
envío y lógica de filtrado por CCAA/vertical — un proyecto aparte. Lo que
existe hoy (routers/asistente.py y la tabla `alertas_leidas` de Supabase)
son alertas dentro de la app para usuarios ya autenticados, no emails.

Mismo patrón que routers/contacto.py: no requiere sesión de usuario (vive
en la landing, antes de cualquier registro), pero sí pasa por el gate
global de INTERNAL_API_KEY vía el proxy de Next.js
(apps/web/app/api/newsletter/route.ts) — nunca es alcanzable directamente
desde el navegador.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.newsletter import NewsletterSuscriptor
from servicios.rate_limit import get_real_ip, get_redis, rate_limit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/newsletter", tags=["Newsletter"])

RATE_LIMIT_PER_HOUR = 5


class NewsletterInput(BaseModel):
    email: EmailStr
    # Honeypot anti-spam: mismo patrón que ContactoInput. Un humano nunca
    # rellena este campo (oculto en el formulario real).
    empresa_web: str | None = Field(default=None, max_length=200)


class NewsletterOutput(BaseModel):
    estado: str = "suscrito"


@router.post("", response_model=NewsletterOutput)
async def suscribir(
    payload: NewsletterInput,
    request: Request,
    redis=Depends(get_redis),
    db: AsyncSession = Depends(get_db),
) -> NewsletterOutput:
    ip = get_real_ip(request)
    await rate_limit(redis, ip, "newsletter", max_req=RATE_LIMIT_PER_HOUR)

    if payload.empresa_web:
        logger.info("Suscripción a newsletter descartada por honeypot (IP=%s)", ip)
        return NewsletterOutput(estado="suscrito")

    email = payload.email.lower()

    existente = await db.scalar(
        select(NewsletterSuscriptor).where(NewsletterSuscriptor.email == email)
    )
    if existente:
        # Ya suscrito (o se había dado de baja): idempotente, no es un
        # error. Tampoco revelamos si el email ya existía en la respuesta,
        # para no convertir el endpoint en un oráculo de emails registrados.
        if not existente.activo:
            existente.activo = True
            await db.commit()
        return NewsletterOutput(estado="suscrito")

    db.add(NewsletterSuscriptor(email=email))
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        logger.exception("Error guardando suscripción a newsletter")
        raise HTTPException(
            status_code=502,
            detail="No se pudo completar la suscripción. Inténtalo de nuevo en unos minutos.",
        )

    return NewsletterOutput(estado="suscrito")
