from typing import Dict, Literal, Optional

from pydantic import BaseModel, Field

from schemas.clasificador import ClasificadorOutput


class OrganizacionDoc(BaseModel):
    nombre: str = Field(..., description="Nombre de la organización (white-label)")
    plan: Optional[str] = None


class TramiteEstadoDoc(BaseModel):
    estado: Literal["pendiente", "en_curso", "completado"] = "pendiente"
    fecha_inicio: Optional[str] = None
    fecha_completado: Optional[str] = None


class ExpedienteDoc(BaseModel):
    id: str
    tipo_instalacion: str
    comunidad: str
    municipio: str
    potencia_kw: float
    uso: Optional[str] = None
    numero_puntos: Optional[int] = None
    modo_recarga: Optional[str] = None
    acceso_publico: Optional[bool] = None
    ubicacion_irve: Optional[str] = None
    requiere_nuevo_suministro: Optional[bool] = None
    combustible: Optional[str] = None
    presion_bar: Optional[str] = None
    solicita_ayuda: Optional[bool] = False
    referencia_cliente: Optional[str] = None
    notas: Optional[str] = None
    creado_en: Optional[str] = None


class GenerarDocumentoInput(BaseModel):
    tipo: Literal["plan", "checklist", "mtd", "dossier"]
    organizacion: OrganizacionDoc
    expediente: ExpedienteDoc
    plan: ClasificadorOutput
    # Clave: orden del trámite como string (viene del JSONB del Bloque 1)
    tramites_estado: Dict[str, TramiteEstadoDoc] = Field(default_factory=dict)
