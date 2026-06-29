from pydantic import BaseModel, Field
from typing import List, Optional

class ClasificadorInput(BaseModel):
    tipo_instalacion: str = Field(..., description="Tipo de instalación, ej. fotovoltaica_autoconsumo")
    comunidad: str = Field(..., description="Comunidad autónoma en formato slug, ej. andalucia")
    potencia_kw: float = Field(..., description="Potencia en kW", ge=0)
    superficie_m2: Optional[float] = Field(None, description="Superficie en m2, si aplica", ge=0)
    uso: str = Field(..., description="Uso de la instalación, ej. residencial, industrial, terciario")
    municipio: str = Field(..., description="Nombre del municipio")
    combustible: Optional[str] = Field(None, description="Tipo de combustible: gas_natural, glp_deposito, glp_envases, gas")
    presion_bar: Optional[str] = Field(None, description="Rango de presión: normal o 5+")
    numero_puntos: Optional[int] = Field(None, description="Número de puntos de recarga")
    potencia_por_punto_kw: Optional[float] = Field(None, description="Potencia por punto en kW")
    modo_recarga: Optional[str] = Field(None, description="Modo de recarga: 1, 2, 3 o 4")
    acceso_publico: Optional[bool] = Field(None, description="True si la IRVE es de acceso público")
    ubicacion_irve: Optional[str] = Field(None, description="interior | exterior | via_publica | garaje_comunitario")
    requiere_nuevo_suministro: Optional[bool] = Field(None, description="True si requiere nuevo suministro o aumento de potencia")
    modalidad: Optional[str] = Field(None, description="nueva | ampliacion | modificacion | legalizacion")
    implantacion: Optional[str] = Field(None, description="cubierta | suelo | interior | exterior | via_publica | marquesina | fachada")
    solicita_ayuda: Optional[bool] = Field(False, description="True si solicita subvenciones")


class TramiteOutput(BaseModel):
    orden: int = Field(..., description="Orden del trámite")
    nombre: str = Field(..., description="Nombre del trámite")
    organismo: str = Field(..., description="Organismo responsable")
    base_legal: str = Field(..., description="Base legal aplicable")
    plazo_estimado_dias: Optional[int] = Field(None, description="Plazo estimado en días")
    documentos_requeridos: List[str] = Field(default_factory=list, description="Lista de documentos requeridos")
    notas: Optional[str] = Field(None, description="Notas adicionales")
    plataforma: Optional[str] = Field(None, description="PUES | TECI | MITECO | distribuidora | ayuntamiento")
    plazo_legal_dias: Optional[int] = Field(None, description="Plazo legal según normativa")
    coste_estimado: Optional[str] = Field(None, description="Estimación de tasas o coste administrativo")

class ClasificadorOutput(BaseModel):
    tramites: List[TramiteOutput] = Field(..., description="Lista ordenada de trámites")
    tiempo_total_estimado_dias: Optional[int] = Field(None, description="Suma de los plazos estimados")
    advertencias: List[str] = Field(default_factory=list, description="Advertencias generales")
