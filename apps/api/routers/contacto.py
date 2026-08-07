"""Endpoint del formulario público de contacto (/contacto en apps/web).

Auditoría 2026-08-06: antes, el flujo de captación de leads no residenciales
del simulador (simulator-wizard.tsx) redirigía a `/contacto`, una página que
no existía (404). Este router es la parte de backend de la página nueva:
recibe el formulario, lo valida, aplica rate limiting y envía un email a
NOTIFICATION_EMAIL vía Resend (reutilizando la misma integración que ya usa
scripts/boe_pipeline.py, sin credenciales nuevas).

No requiere autenticación de usuario (es un formulario público de la
landing), pero SÍ pasa por el gate global de INTERNAL_API_KEY: solo la ruta
proxy de Next.js (apps/web/app/api/contacto/route.ts) debe poder llamarlo,
nunca el navegador directamente. A diferencia de /simulador, no está en la
lista de exenciones de seguridad.py.
"""

from __future__ import annotations

import logging
import os

import resend
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field, field_validator

from config import settings
from servicios.rate_limit import get_real_ip, get_redis, rate_limit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contacto", tags=["Contacto"])

RATE_LIMIT_PER_HOUR = 5


class ContactoInput(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    telefono: str | None = Field(default=None, max_length=30)
    empresa: str | None = Field(default=None, max_length=120)
    tipo_instalacion: str | None = Field(
        default=None,
        max_length=60,
        description="Viene del wizard del simulador cuando el lead es un tipo de inmueble no residencial.",
    )
    mensaje: str = Field(..., min_length=10, max_length=2000)
    # Honeypot anti-spam: campo invisible en el formulario real: si llega
    # relleno, es un bot. No es infalible, pero no cuesta nada añadirlo.
    empresa_web: str | None = Field(default=None, max_length=200)

    @field_validator("nombre", "mensaje")
    @classmethod
    def _sin_espacios_solo(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("No puede estar vacío")
        return v


class ContactoOutput(BaseModel):
    estado: str = "recibido"


@router.post("", response_model=ContactoOutput)
async def enviar_contacto(
    payload: ContactoInput,
    request: Request,
    redis=Depends(get_redis),
) -> ContactoOutput:
    ip = get_real_ip(request)
    await rate_limit(redis, ip, "contacto", max_req=RATE_LIMIT_PER_HOUR)

    if payload.empresa_web:
        # Honeypot relleno -> bot. Respondemos 200 igualmente para no darle
        # a un bot la señal de "campo detectado" (comportamiento estándar),
        # pero no enviamos ningún email.
        logger.info("Formulario de contacto descartado por honeypot (IP=%s)", ip)
        return ContactoOutput(estado="recibido")

    resend_key = settings.RESEND_API_KEY or os.getenv("RESEND_API_KEY", "")
    email_dest = settings.NOTIFICATION_EMAIL or os.getenv("NOTIFICATION_EMAIL", "")
    from_domain = settings.RESEND_FROM_DOMAIN or os.getenv("RESEND_FROM_DOMAIN", "permitflow.es")

    if not resend_key or not email_dest:
        # No hay integración de email configurada en este entorno. No lo
        # tratamos como éxito silencioso (el lead se perdería sin que nadie
        # se entere): devolvemos 503 explícito para que el frontend lo
        # muestre como error, no como "mensaje enviado".
        logger.error("Formulario de contacto recibido pero RESEND_API_KEY/NOTIFICATION_EMAIL no están configurados")
        raise HTTPException(
            status_code=503,
            detail="El formulario de contacto no está disponible en este momento. Escríbenos directamente a la dirección de contacto.",
        )

    resend.api_key = resend_key

    lineas = [
        f"<p><strong>Nombre:</strong> {_escapar(payload.nombre)}</p>",
        f"<p><strong>Email:</strong> {_escapar(payload.email)}</p>",
    ]
    if payload.telefono:
        lineas.append(f"<p><strong>Teléfono:</strong> {_escapar(payload.telefono)}</p>")
    if payload.empresa:
        lineas.append(f"<p><strong>Empresa:</strong> {_escapar(payload.empresa)}</p>")
    if payload.tipo_instalacion:
        lineas.append(f"<p><strong>Tipo de instalación:</strong> {_escapar(payload.tipo_instalacion)}</p>")
    lineas.append(f"<p><strong>Mensaje:</strong><br>{_escapar(payload.mensaje).replace(chr(10), '<br>')}</p>")

    try:
        resend.Emails.send({
            "from": f"Formulario de contacto <noreply@{from_domain}>",
            "to": email_dest,
            "reply_to": payload.email,
            "subject": f"Nuevo contacto desde la web: {payload.nombre}",
            "html": "".join(lineas),
        })
    except Exception:
        logger.exception("Error enviando email de contacto vía Resend")
        raise HTTPException(
            status_code=502,
            detail="No se pudo enviar el mensaje. Inténtalo de nuevo en unos minutos.",
        )

    return ContactoOutput(estado="recibido")


def _escapar(texto: str) -> str:
    """Escapado HTML mínimo: el mensaje del usuario se interpola en un email
    HTML y no debe poder inyectar marcado (aunque el destinatario es interno,
    no el navegador de otro usuario)."""
    return (
        texto.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )
