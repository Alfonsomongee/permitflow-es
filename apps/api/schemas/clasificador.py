from pydantic import BaseModel, Field
from typing import List, Literal, Optional

TipoInstalacion = Literal[
    "fotovoltaica_autoconsumo",
    "irve",
    "climatizacion_aerotermia",
    "acs",
    "gas_baja_presion",
]

ComunidadAutonoma = Literal[
    "andalucia", "aragon", "asturias", "baleares", "canarias", "cantabria",
    "castilla_la_mancha", "castilla_leon", "cataluna", "comunidad_valenciana",
    "extremadura", "galicia", "la_rioja", "madrid", "murcia", "navarra",
    "pais_vasco",
]

# ─── Input ────────────────────────────────────────────────────────────────────

class ClasificadorInput(BaseModel):
    tipo_instalacion: TipoInstalacion = Field(..., description="Tipo de instalación, ej. fotovoltaica_autoconsumo")
    comunidad: ComunidadAutonoma = Field(..., description="Comunidad autónoma en formato slug, ej. andalucia")
    potencia_kw: float = Field(..., description="Potencia en kW", ge=0)
    superficie_m2: Optional[float] = Field(None, description="Superficie en m2, si aplica", ge=0)
    uso: str = Field(..., description="Uso de la instalación: residencial, industrial, terciario")
    municipio: str = Field(..., description="Nombre del municipio")
    combustible: Optional[str] = Field(None, description="Tipo de combustible: gas_natural, glp_deposito, glp_envases")
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


# ─── Output ───────────────────────────────────────────────────────────────────

class DocumentoRequerido(BaseModel):
    """Documento con descripción enriquecida (nuevo formato v1.1)"""
    id: str = Field(..., description="Identificador único del documento")
    label: str = Field(..., description="Nombre legible del documento")
    descripcion: str = Field(..., description="Descripción detallada del contenido y propósito")
    obligatorio: bool = Field(True, description="True si es obligatorio, False si es opcional")


class TramiteOutput(BaseModel):
    orden: int = Field(..., description="Orden del trámite")
    nombre: str = Field(..., description="Nombre del trámite")
    organismo: str = Field(..., description="Organismo responsable")
    base_legal: str = Field(..., description="Base legal aplicable")
    plazo_estimado_dias: Optional[int] = Field(None, description="Plazo estimado en días")
    plazo_legal_dias: Optional[int] = Field(None, description="Plazo legal según normativa")
    # Acepta tanto el formato legado (lista de strings) como el nuevo (lista de objetos)
    documentos_requeridos: List[DocumentoRequerido] = Field(
        default_factory=list,
        description="Lista de documentos requeridos con descripción enriquecida"
    )
    notas: Optional[str] = Field(None, description="Notas adicionales")
    plataforma: Optional[str] = Field(None, description="PUES | TECI | MITECO | distribuidora | ayuntamiento")
    plataforma_url: Optional[str] = Field(None, description="URL directa a la plataforma de tramitación")
    coste_estimado: Optional[str] = Field(None, description="Estimación de tasas o coste administrativo")
    formulario_ref: Optional[str] = Field(None, description="Código o referencia del formulario/procedimiento oficial")
    paralelo_con: Optional[int] = Field(
        None, description="Orden (ya renumerado) del trámite con el que puede ejecutarse en paralelo"
    )
    regla_id: Optional[str] = Field(
        None, description="Id de la regla del motor normativo que generó este trámite (clave estable para analítica)"
    )


class ClasificadorOutput(BaseModel):
    tramites: List[TramiteOutput] = Field(..., description="Lista ordenada de trámites")
    tiempo_total_estimado_dias: Optional[int] = Field(None, description="Suma de los plazos estimados")
    advertencias: List[str] = Field(default_factory=list, description="Advertencias generales")
