"""Modelo de suscriptores de la newsletter pública (alertas del BOE).

Cierra el hueco documentado en Footer.tsx (D-11, auditoría 2026-08-06):
el formulario de la landing existía deshabilitado porque no había backend
que persistiera el email. Este modelo solo almacena la suscripción; el
envío real de alertas por email es un proyecto aparte, fuera de alcance
aquí (ver comentario en routers/newsletter.py).
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class NewsletterSuscriptor(Base):
    __tablename__ = "newsletter_suscriptores"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    suscrito_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=text("now()"),
    )
