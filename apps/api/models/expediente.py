from sqlalchemy import String, Float, Boolean, Integer, DateTime, ForeignKey, text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
from datetime import datetime, timezone
from database import Base
from typing import Optional

class Expediente(Base):
    __tablename__ = "expedientes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizaciones.id"), nullable=False, index=True)
    clerk_user_id: Mapped[str] = mapped_column(String, nullable=False)
    
    tipo_instalacion: Mapped[str] = mapped_column(String, nullable=False)
    comunidad: Mapped[str] = mapped_column(String, nullable=False)
    municipio: Mapped[str] = mapped_column(String, nullable=False)
    potencia_kw: Mapped[float] = mapped_column(Float, nullable=False)
    uso: Mapped[str] = mapped_column(String, nullable=False)
    
    numero_puntos: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    modo_recarga: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    acceso_publico: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    ubicacion_irve: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    requiere_nuevo_suministro: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    combustible: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    presion_bar: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    solicita_ayuda: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    
    plan_tramitacion: Mapped[dict] = mapped_column(JSONB, nullable=False)
    tramites_estado: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb"), default=dict
    )
    tiempo_total_dias: Mapped[int] = mapped_column(Integer, nullable=False)
    estado: Mapped[str] = mapped_column(String, default="pendiente", nullable=False)
    tramites_completados: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    referencia_cliente: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    notas: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    actualizado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
