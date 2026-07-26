"""Modelo de caché de idoneidad geográfica.

Almacena los resultados de PVGIS y zonas climáticas en PostgreSQL
para evitar llamadas repetidas a APIs externas (Google Geocoding, PVGIS).
También se usa para rate-limiting por organización.
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, String, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class IdoneidadCache(Base):
    __tablename__ = "idoneidad_cache"

    clave: Mapped[str] = mapped_column(
        String,
        primary_key=True,
        comment="Formato: pvgis:{lat_2dec}:{lon_2dec}:{angle}:{aspect}",
    )
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    calculado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=text("now()"),
    )
