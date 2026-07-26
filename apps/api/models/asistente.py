from sqlalchemy import String, Integer, DateTime, ForeignKey, Date, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone, date
from database import Base
from typing import Optional

class AsistenteUso(Base):
    """Contadores diarios de uso del asistente por organización."""
    __tablename__ = "asistente_uso"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizaciones.id"), nullable=False, index=True)
    fecha: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    
    mensajes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tokens_entrada: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tokens_entrada_cache: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tokens_salida: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    actualizado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint('org_id', 'fecha', name='uq_asistente_uso_org_fecha'),
    )

class AsistenteConversacion(Base):
    """Una sesión de chat con el asistente."""
    __tablename__ = "asistente_conversaciones"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizaciones.id"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String, nullable=False) # Clerk user ID
    expediente_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("expedientes.id"), nullable=True)
    
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class AsistenteMensaje(Base):
    """Un mensaje individual dentro de una conversación."""
    __tablename__ = "asistente_mensajes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    conversacion_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("asistente_conversaciones.id"), nullable=False, index=True)
    rol: Mapped[str] = mapped_column(String, nullable=False) # 'user' o 'assistant'
    contenido: Mapped[str] = mapped_column(String, nullable=False)
    tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True) # Solo aplicable a 'assistant' usualmente
    
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class AsistenteReporte(Base):
    """Reportes de los usuarios sobre respuestas incorrectas o alucinaciones."""
    __tablename__ = "asistente_reportes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    mensaje_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("asistente_mensajes.id"), nullable=False, index=True)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizaciones.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String, nullable=False) # Clerk user ID
    contenido: Mapped[str] = mapped_column(String, nullable=False) # Explicación de por qué está mal
    
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
