from pydantic import BaseModel, Field
from typing import List, Optional

class ClasificadorInput(BaseModel):
    tipo_instalacion: str = Field(..., description="Tipo de instalación, ej. fotovoltaica_autoconsumo")
    comunidad: str = Field(..., description="Comunidad autónoma en formato slug, ej. andalucia")
    potencia_kw: float = Field(..., description="Potencia en kW", ge=0)
    superficie_m2: Optional[float] = Field(None, description="Superficie en m2, si aplica", ge=0)
    uso: str = Field(..., description="Uso de la instalación, ej. residencial, industrial, terciario")
    municipio: str = Field(..., description="Nombre del municipio")

class TramiteOutput(BaseModel):
    orden: int = Field(..., description="Orden del trámite")
    nombre: str = Field(..., description="Nombre del trámite")
    organismo: str = Field(..., description="Organismo responsable")
    base_legal: str = Field(..., description="Base legal aplicable")
    plazo_estimado_dias: Optional[int] = Field(None, description="Plazo estimado en días")
    documentos_requeridos: List[str] = Field(default_factory=list, description="Lista de documentos requeridos")
    notas: Optional[str] = Field(None, description="Notas adicionales")

class ClasificadorOutput(BaseModel):
    tramites: List[TramiteOutput] = Field(..., description="Lista ordenada de trámites")
    tiempo_total_estimado_dias: Optional[int] = Field(None, description="Suma de los plazos estimados")
    advertencias: List[str] = Field(default_factory=list, description="Advertencias generales")
