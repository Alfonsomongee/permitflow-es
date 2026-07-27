from pydantic import BaseModel, Field, model_validator
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
    combustible: Optional[str] = Field(None, description="Tipo de combustible: gas_natural, glp_deposito, glp_envases")
    presion_bar: Optional[str] = Field(None, description="Rango de presión: normal o 5+")
    numero_puntos: Optional[int] = Field(None, description="Número de puntos de recarga")
    potencia_por_punto_kw: Optional[float] = Field(None, description="Potencia por punto en kW")
    modo_recarga: Optional[str] = Field(None, description="Modo de recarga: 1, 2, 3 o 4")
    acceso_publico: Optional[bool] = Field(None, description="True si la IRVE es de acceso público")
    ubicacion_irve: Optional[str] = Field(None, description="interior | exterior | via_publica | garaje_comunitario")
    requiere_nuevo_suministro: Optional[bool] = Field(None, description="True si requiere nuevo suministro o aumento de potencia")
    modalidad: Optional[str] = Field(None, description="nueva | ampliacion | modificacion | legalizacion")
    modalidad_autoconsumo: Optional[Literal["sin_excedentes", "con_excedentes_sin_compensacion", "con_excedentes_con_compensacion"]] = Field(None, description="Modalidad específica para autoconsumo: sin_excedentes, con_excedentes_sin_compensacion o con_excedentes_con_compensacion")
    implantacion: Optional[str] = Field(None, description="cubierta | suelo | interior | exterior | via_publica | marquesina | fachada")
    solicita_ayuda: Optional[bool] = Field(False, description="True si solicita subvenciones")
    tension: Optional[Literal["BT", "AT"]] = Field(None, description="Nivel de tensión de conexión: BT o AT")
    
    # ACS specific fields
    acumulacion: Optional[bool] = Field(None, description="True si tiene acumulación")
    recirculacion: Optional[bool] = Field(None, description="True si tiene recirculación")
    uso_colectivo: Optional[bool] = Field(None, description="True si es de uso colectivo")
    
    inversion_eur: Optional[float] = Field(None, description="Presupuesto de la instalación en euros")

    # Gas specific fields
    clase_instalacion_gas: Optional[Literal["individual", "comun", "conexion_servicio"]] = Field(None, description="Clase de instalación de gas")
    presion_operacion_bar: Optional[float] = Field(None, description="Presión de operación en bar")
    es_ampliacion: Optional[bool] = Field(False, description="True si es una ampliación de instalación existente")
    incremento_potencia_pct: Optional[float] = Field(0, description="Porcentaje de incremento de potencia respecto a la original")
    potencia_resultante_kw: Optional[float] = Field(None, description="Potencia total resultante tras ampliación")
    presion_resultante_bar: Optional[float] = Field(None, description="Presión resultante tras ampliación")
    combustible_gas: Optional[Literal["gas_natural", "glp"]] = Field(None, description="Variante de gas combustible")

    # IRVE specific fields
    instalacion_origen_modificada: Optional[bool] = Field(None, description="True si la instalación de origen ha sido modificada")
    garaje_sujeto_inspeccion_periodica: Optional[bool] = Field(None, description="True si el garaje está sujeto a inspección periódica")

    # Autoconsumo specific fields
    nivel_tension_consumidor: Optional[Literal["bt", "at"]] = Field(None, description="Nivel de tensión del consumidor")
    nivel_tension_generacion: Optional[Literal["bt", "at"]] = Field(None, description="Nivel de tensión de generación")
    nivel_tension_conexion: Optional[Literal["bt", "at"]] = Field(None, description="Nivel de tensión de conexión")
    requiere_registro_produccion: Optional[bool] = Field(False, description="True si la instalación requiere inscripción en el Registro de Producción de Energía Eléctrica")

    # ACS specific fields
    incluida_ambito_rd_487_2022: Optional[bool] = Field(None, description="True si la instalación está incluida en el ámbito de aplicación del RD 487/2022 (Legionela)")
    incluida_ambito_legionella: Optional[bool] = Field(None, description="True si la instalación está incluida en el ámbito de prevención de Legionela (Decret 352/2004)")

    # Cataluña specific fields
    uso_edificio: Optional[Literal["residencial", "no_residencial"]] = Field(None, description="Uso del edificio para IRVE/garajes")
    ventilacion_garaje: Optional[Literal["natural", "forzada"]] = Field(None, description="Tipo de ventilación del garaje para IRVE")
    numero_plazas_garaje: Optional[int] = Field(None, description="Número de plazas del garaje para IRVE")
    garaje_existente: Optional[bool] = Field(None, description="True si el garaje es existente (para ITC-BT-04)")
    ubicacion_suelo: Optional[Literal["urbanizado", "no_urbanizable"]] = Field(None, description="Clasificación del suelo para fotovoltaica")
    requiere_acceso_conexion: Optional[bool] = Field(None, description="True si la instalación requiere acceso y conexión a red de distribución")

    @model_validator(mode='after')
    def validate_inputs_by_ca(self):
        # Madrid Gas Validation
        if self.comunidad == "madrid" and self.tipo_instalacion == "gas_baja_presion":
            if self.potencia_resultante_kw is None:
                raise ValueError("potencia_resultante_kw is required for gas installations")
            if self.presion_resultante_bar is None:
                raise ValueError("presion_resultante_bar is required for gas installations")
            if self.es_ampliacion:
                if self.incremento_potencia_pct is None or self.incremento_potencia_pct == 0:
                    raise ValueError("incremento_potencia_pct must be provided and greater than 0 when es_ampliacion is True")
        
        # Cataluña Validations
        if self.comunidad == "cataluna":
            if self.tipo_instalacion == "gas_baja_presion":
                if self.potencia_resultante_kw is None:
                    raise ValueError("revision_manual")
                if self.presion_resultante_bar is None:
                    raise ValueError("revision_manual")
                if self.es_ampliacion:
                    if self.incremento_potencia_pct is None or self.incremento_potencia_pct == 0:
                        raise ValueError("revision_manual")
            
            elif self.tipo_instalacion == "irve" and self.ubicacion_irve == "garaje_comunitario":
                if self.uso_edificio is None:
                    raise ValueError("revision_manual")
                if self.ventilacion_garaje is None:
                    raise ValueError("revision_manual")
                if self.numero_plazas_garaje is None:
                    raise ValueError("revision_manual")
                if self.garaje_existente is None:
                    raise ValueError("revision_manual")
            
            elif self.tipo_instalacion == "fotovoltaica_autoconsumo":
                if self.modalidad_autoconsumo is None:
                    raise ValueError("revision_manual")
                if self.ubicacion_suelo is None:
                    raise ValueError("revision_manual")
                if self.requiere_acceso_conexion is None:
                    raise ValueError("revision_manual")
            
            elif self.tipo_instalacion == "acs":
                if self.incluida_ambito_legionella is None:
                    raise ValueError("revision_manual")
                    
        return self

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
    registro_salida: Optional[str] = Field(None, description="Registro de salida de la instalación, ej. RITSIC")
    medio_presentacion: Optional[str] = Field(None, description="Medio de presentación, ej. electronico_obligatorio")
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
    nivel_verificacion: Literal["verificada", "generica"] = Field(
        "verificada",
        description="'generica' si el JSON de normativa aún no tiene verificación autonómica específica",
    )
