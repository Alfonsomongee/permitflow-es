from sqlalchemy import Column, String, Float, Date, DateTime, JSON, ForeignKey, Boolean, Integer, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from database import Base

class CatalogoComponente(Base):
    __tablename__ = "catalogo_componentes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String, nullable=False)
    tipo = Column(String, nullable=False)  # 'panel', 'inversor', 'bateria'
    coste = Column(Float, nullable=False)
    fuente_url = Column(String, nullable=False)
    fecha_verificacion = Column(Date, nullable=False)
    nivel_verificacion = Column(String, nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

class AnalisisFactura(Base):
    __tablename__ = "analisis_facturas"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # CUPS no se persiste en claro (dato personal: identifica domicilio).
    # Se guarda el HMAC-SHA256 para deduplicación/caché sin revelar el valor.
    cups_hash = Column(String, nullable=True)
    consumo_anual_kwh = Column(Float, nullable=True)
    potencia_contratada_kw = Column(Float, nullable=True)
    estado_extraccion = Column(String, nullable=False)  # 'exitoso', 'no_extraido'
    # Fuente de extracción por campo: {"cups": "regex", "consumo": "llm", ...}
    extraccion_fuente = Column(JSON, nullable=True)
    fuente_dato = Column(String, nullable=True)  # 'leido' | 'estimado'
    # datos_raw se purga automáticamente a los 30 días (ver job de purga)
    datos_raw = Column(JSON, nullable=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

class EstudioEnergetico(Base):
    __tablename__ = "estudios_energeticos"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analisis_factura_id = Column(UUID(as_uuid=True), ForeignKey("analisis_facturas.id"), nullable=True)
    # ip_origen eliminada: no tiene función de producto y es dato personal persistente.
    # El rate limiting por IP usa Redis con TTL 1h (interés legítimo).
    estado = Column(String, nullable=False, default="pendiente")  # pendiente | completado | error
    resultado_json = Column(JSON, nullable=True)  # null hasta que la BackgroundTask completa
    creado_en = Column(DateTime(timezone=True), server_default=func.now())


# Índice sobre la FK para evitar seq scan en consultas por analisis
Index("ix_estudios_analisis_id", EstudioEnergetico.analisis_factura_id)
