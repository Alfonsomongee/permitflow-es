from sqlalchemy import Column, String, Float, Boolean, Integer, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
from datetime import datetime, timezone
from database import Base

class Expediente(Base):
    __tablename__ = "expedientes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizaciones.id"), nullable=False, index=True)
    clerk_user_id = Column(String, nullable=False)
    
    tipo_instalacion = Column(String, nullable=False)
    comunidad = Column(String, nullable=False)
    municipio = Column(String, nullable=False)
    potencia_kw = Column(Float, nullable=False)
    uso = Column(String, nullable=False)
    
    numero_puntos = Column(Integer, nullable=True)
    modo_recarga = Column(String, nullable=True)
    acceso_publico = Column(Boolean, nullable=True)
    ubicacion_irve = Column(String, nullable=True)
    requiere_nuevo_suministro = Column(Boolean, nullable=True)
    combustible = Column(String, nullable=True)
    presion_bar = Column(String, nullable=True)
    solicita_ayuda = Column(Boolean, nullable=True)
    
    plan_tramitacion = Column(JSONB, nullable=False)
    tiempo_total_dias = Column(Integer, nullable=False)
    estado = Column(String, default="pendiente", nullable=False)
    tramites_completados = Column(Integer, default=0, nullable=False)
    
    creado_en = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    actualizado_en = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
