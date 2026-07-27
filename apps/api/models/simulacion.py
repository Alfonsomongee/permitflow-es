from sqlalchemy import Column, String, Float, Date, DateTime, JSON, ForeignKey, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
import uuid
import datetime
from database import Base

class CatalogoComponente(Base):
    __tablename__ = "catalogo_componentes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String, nullable=False)
    tipo = Column(String, nullable=False) # e.g., 'panel', 'inversor', 'bateria'
    coste = Column(Float, nullable=False)
    fuente_url = Column(String, nullable=False)
    fecha_verificacion = Column(Date, nullable=False)
    nivel_verificacion = Column(String, nullable=False)
    creado_en = Column(DateTime, default=datetime.datetime.utcnow)

class AnalisisFactura(Base):
    __tablename__ = "analisis_facturas"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cups = Column(String, nullable=True) # Validated or null if invalid
    consumo_anual_kwh = Column(Float, nullable=True)
    potencia_contratada_kw = Column(Float, nullable=True)
    estado_extraccion = Column(String, nullable=False) # e.g., 'exitoso', 'no_extraido', 'pendiente_validacion'
    datos_raw = Column(JSON, nullable=True) # Any additional extracted data
    creado_en = Column(DateTime, default=datetime.datetime.utcnow)

class EstudioEnergetico(Base):
    __tablename__ = "estudios_energeticos"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analisis_factura_id = Column(UUID(as_uuid=True), ForeignKey("analisis_facturas.id"), nullable=True)
    ip_origen = Column(String, nullable=True) # For anonymous rate limiting
    resultado_json = Column(JSON, nullable=False) # Simulation result
    creado_en = Column(DateTime, default=datetime.datetime.utcnow)
