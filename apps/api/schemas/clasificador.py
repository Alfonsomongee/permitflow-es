from pydantic import BaseModel, Field, model_validator
from typing import List, Literal, Optional

TipoInstalacion = Literal[
    "fotovoltaica_autoconsumo",
    "irve",
    "climatizacion_aerotermia",
    "acs",
    "gas_baja_presion",
]

TipoActuacion = Literal[
    "accion_usuario",
    "oficio_administracion",
    "informativa",
    "revision_manual",
]

ComunidadAutonoma = Literal[
    "andalucia", "aragon", "asturias", "baleares", "canarias", "cantabria",
    "castilla_la_mancha", "castilla_leon", "cataluna", "comunidad_valenciana",
    "extremadura", "galicia", "la_rioja", "madrid", "murcia", "navarra",
    "pais_vasco",
]

# Los mismos tres valores que ofrece el formulario (USO_OPTIONS). Era `str`
# libre, así que uso="marciano" o uso="" se aceptaban y cambiaban el plan sin
# error, porque las reglas ramifican sobre este campo.
Uso = Literal["residencial", "terciario", "industrial"]

# Modos de recarga de la IEC 61851. No existe el modo 5.
ModoRecarga = Literal["1", "2", "3", "4"]

# ─── Input ────────────────────────────────────────────────────────────────────

class ClasificadorInput(BaseModel):
    tipo_instalacion: TipoInstalacion = Field(..., description="Tipo de instalación, ej. fotovoltaica_autoconsumo")
    comunidad: ComunidadAutonoma = Field(..., description="Comunidad autónoma en formato slug, ej. andalucia")
    # gt=0: una instalación de 0 kW no existe. Antes se aceptaba y devolvía un
    # plan completo de trámites (auditoría QA 2026-08-11, M-02).
    potencia_kw: float = Field(..., description="Potencia en kW", gt=0)
    superficie_m2: Optional[float] = Field(None, description="Superficie en m2, si aplica", ge=0)
    # Literal en vez de str libre: las reglas ramifican sobre este valor, así que
    # una errata cambiaba el plan en silencio en vez de dar error.
    uso: Uso = Field(..., description="Uso de la instalación: residencial, industrial, terciario")
    combustible: Optional[str] = Field(None, description="Tipo de combustible: gas_natural, glp_deposito, glp_envases")
    presion_bar: Optional[str] = Field(None, description="Rango de presión: normal o 5+")
    numero_puntos: Optional[int] = Field(None, description="Número de puntos de recarga", ge=1)
    potencia_por_punto_kw: Optional[float] = Field(None, description="Potencia por punto en kW", gt=0)
    modo_recarga: Optional[ModoRecarga] = Field(None, description="Modo de recarga: 1, 2, 3 o 4")
    acceso_publico: Optional[bool] = Field(None, description="True si la IRVE es de acceso público")
    ubicacion_irve: Optional[str] = Field(None, description="interior | exterior | via_publica | garaje_comunitario")
    requiere_nuevo_suministro: Optional[bool] = Field(None, description="True si requiere nuevo suministro o aumento de potencia")
    modalidad: Optional[str] = Field(None, description="nueva | ampliacion | modificacion | legalizacion")
    modalidad_autoconsumo: Optional[Literal["sin_excedentes", "con_excedentes_sin_compensacion", "con_excedentes_con_compensacion"]] = Field(None, description="Modalidad específica para autoconsumo: sin_excedentes, con_excedentes_sin_compensacion o con_excedentes_con_compensacion")
    implantacion: Optional[str] = Field(None, description="cubierta | suelo | interior | exterior | via_publica | marquesina | fachada")
    solicita_ayuda: Optional[bool] = Field(False, description="True si solicita subvenciones")
    tension: Optional[Literal["BT", "AT"]] = Field(None, description="Nivel de tensión de conexión: BT o AT (compatibilidad externa; las reglas nuevas usan nivel_tension_conexion)")
    
    # ACS specific fields
    acumulacion: Optional[bool] = Field(None, description="True si tiene acumulación")
    recirculacion: Optional[bool] = Field(None, description="True si tiene recirculación")
    uso_colectivo: Optional[bool] = Field(None, description="True si es de uso colectivo")
    
    inversion_eur: Optional[float] = Field(None, description="Presupuesto de la instalación en euros", ge=0)

    # Gas specific fields
    clase_instalacion_gas: Optional[Literal["individual", "comun", "conexion_servicio"]] = Field(None, description="Clase de instalación de gas")
    # ge=0 en las presiones: una presión negativa no solo es imposible, es que
    # además relajaba los requisitos (hacía desaparecer el proyecto técnico).
    presion_operacion_bar: Optional[float] = Field(None, description="Presión de operación en bar", ge=0)
    es_ampliacion: Optional[bool] = Field(False, description="True si es una ampliación de instalación existente")
    incremento_potencia_pct: Optional[float] = Field(0, description="Porcentaje de incremento de potencia respecto a la original", ge=0)
    potencia_resultante_kw: Optional[float] = Field(None, description="Potencia total resultante tras ampliación", ge=0)
    presion_resultante_bar: Optional[float] = Field(None, description="Presión resultante tras ampliación", ge=0)
    combustible_gas: Optional[Literal["gas_natural", "glp"]] = Field(None, description="Variante de gas combustible")

    # IRVE specific fields
    instalacion_origen_modificada: Optional[bool] = Field(None, description="True si la instalación de origen ha sido modificada")
    garaje_sujeto_inspeccion_periodica: Optional[bool] = Field(None, description="True si el garaje está sujeto a inspección periódica")
    numero_suministros_edificio: Optional[int] = Field(None, description="Número de suministros eléctricos del edificio (IRVE: determina inspección inicial OC en edificios residenciales ≥20 suministros)", ge=0)
    requiere_inspeccion_inicial_oc: Optional[bool] = Field(None, description="Dato técnico derivado: True si la instalación requiere inspección inicial por organismo de control. No debe introducirse manualmente.")

    # ACS centralizada
    acs_centralizada: Optional[bool] = Field(None, description="True si la instalación ACS es de uso centralizado (instalación común de edificio)")
    dispone_acumulacion: Optional[bool] = Field(None, description="True si la instalación ACS tiene depósito de acumulación")
    dispone_circuito_retorno: Optional[bool] = Field(None, description="True si la instalación ACS tiene circuito de retorno")

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
        # Los mensajes van en castellano como el resto de la aplicación: el proxy
        # los reenvía tal cual al usuario, así que estaban llegando en inglés
        # (auditoría QA 2026-08-11, B-06).
        if self.comunidad == "madrid" and self.tipo_instalacion == "gas_baja_presion":
            if self.potencia_resultante_kw is None:
                raise ValueError(
                    "Indica la potencia resultante de la instalación de gas: en Madrid "
                    "determina si hace falta proyecto técnico."
                )
            if self.presion_resultante_bar is None:
                raise ValueError(
                    "Indica la presión resultante de la instalación de gas: en Madrid "
                    "determina el procedimiento aplicable."
                )
            if self.es_ampliacion:
                if self.incremento_potencia_pct is None or self.incremento_potencia_pct == 0:
                    raise ValueError(
                        "Has marcado que es una ampliación: indica el porcentaje de "
                        "incremento de potencia respecto a la instalación original."
                    )
        
        # Cataluña Validations
        if self.comunidad == "cataluna":
            if self.tipo_instalacion == "gas_baja_presion":
                if self.potencia_resultante_kw is None:
                    raise ValueError(
                        "Indica la potencia resultante de la instalación de gas: en Cataluña "
                        "determina si hace falta proyecto técnico."
                    )
                if self.presion_resultante_bar is None:
                    raise ValueError(
                        "Indica la presión resultante de la instalación de gas: en Cataluña determina "
                        "el procedimiento aplicable."
                    )
                if self.es_ampliacion:
                    if self.incremento_potencia_pct is None or self.incremento_potencia_pct == 0:
                        raise ValueError(
                            "Has marcado que es una ampliación: indica el porcentaje de incremento de "
                            "potencia respecto a la instalación original."
                        )
            
            elif self.tipo_instalacion == "irve" and self.ubicacion_irve == "garaje_comunitario":
                if self.uso_edificio is None:
                    raise ValueError(
                        "Indica el uso del edificio: en un garaje comunitario de Cataluña, la "
                        "ITC-BT-04 distingue entre edificio residencial y no residencial."
                    )
                if self.ventilacion_garaje is None:
                    raise ValueError(
                        "Indica si la ventilación del garaje es natural o forzada: condiciona los "
                        "requisitos de seguridad de la instalación de recarga."
                    )
                if self.numero_plazas_garaje is None:
                    raise ValueError(
                        "Indica el número de plazas del garaje: es uno de los umbrales que decide el "
                        "nivel de documentación exigible."
                    )
                if self.garaje_existente is None:
                    raise ValueError(
                        "Indica si el garaje es existente o de obra nueva: la ITC-BT-04 aplica "
                        "requisitos distintos a cada caso."
                    )
            
            elif self.tipo_instalacion == "fotovoltaica_autoconsumo":
                if self.modalidad_autoconsumo is None:
                    raise ValueError(
                        "Selecciona la modalidad de autoconsumo (sin excedentes, con excedentes con o "
                        "sin compensación): determina buena parte del plan."
                    )
                if self.ubicacion_suelo is None:
                    raise ValueError(
                        "Indica la clasificación del suelo (urbanizado o no urbanizable): en suelo no "
                        "urbanizable pueden exigirse autorizaciones adicionales."
                    )
                if self.requiere_acceso_conexion is None:
                    raise ValueError(
                        "Indica si la instalación requiere acceso y conexión a la red de "
                        "distribución: de ello depende todo el bloque de trámites con la "
                        "distribuidora."
                    )

            elif self.tipo_instalacion == "acs":
                # La legionella solo es dato obligatorio cuando la instalación es
                # centralizada o supera 70 kW (ámbito de mayor riesgo sanitario)
                legionella_material = (
                    (self.acs_centralizada is True)
                    or (self.potencia_kw is not None and self.potencia_kw >= 70)
                )
                if legionella_material and self.incluida_ambito_legionella is None:
                    raise ValueError(
                        "Indica si la instalación está incluida en el ámbito de prevención de "
                        "legionelosis: es obligatorio en Cataluña para ACS centralizada o de 70 kW o "
                        "más (Decret 352/2004)."
                    )
                # Inspección periódica: si centralizada y >70 kW, se necesitan datos de acumulación/retorno
                if (
                    self.acs_centralizada is True
                    and self.potencia_kw is not None
                    and self.potencia_kw > 70
                    and self.dispone_acumulacion is None
                    and self.dispone_circuito_retorno is None
                ):
                    raise ValueError(
                        "Indica si la instalación dispone de acumulación y/o circuito de retorno: en "
                        "ACS centralizada de más de 70 kW determina el régimen de inspección "
                        "periódica."
                    )
                    
        # Sincronización tension ↔ nivel_tension_conexion
        if self.nivel_tension_conexion is None and self.tension is not None:
            self.nivel_tension_conexion = self.tension.lower()  # type: ignore[assignment]
        if (
            self.nivel_tension_conexion is not None
            and self.tension is not None
            and self.nivel_tension_conexion != self.tension.lower()
        ):
            raise ValueError(
                "tension y nivel_tension_conexion contienen valores incompatibles"
            )

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
    tipo_actuacion: TipoActuacion = Field(
        default="accion_usuario",
        description="Naturaleza de la actuación dentro del plan.",
    )
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


class RiesgoTramiteOutput(BaseModel):
    orden: int
    nombre: str
    riesgo: Literal["bajo", "medio", "alto"]
    motivos: List[str] = Field(default_factory=list)


class RiesgoNormativoOutput(BaseModel):
    severidad_normativa: Literal["critico", "atencion", "verificada"]
    tramites: List[RiesgoTramiteOutput]
    resumen: dict[str, int]
    hay_riesgo_alto: bool


class ClasificadorOutput(BaseModel):
    tramites: List[TramiteOutput] = Field(..., description="Lista ordenada de trámites")
    tiempo_total_estimado_dias: Optional[int] = Field(None, description="Suma de los plazos estimados")
    advertencias: List[str] = Field(default_factory=list, description="Advertencias generales")
    nivel_verificacion: Literal[
        "verificada",
        "verificada_parcialmente",
        "verificado_con_observaciones",
        "en_revision",
        "borrador_verificado_parcialmente",
        "generica",
    ] = Field(
        "verificada",
        description="'generica' si el JSON de normativa aún no tiene verificación autonómica específica; 'verificada_parcialmente' o 'en_revision' si hay huecos documentados",
    )
    estado: Optional[str] = Field(
        None,
        description=(
            "Campo de auditoría interno del JSON de normativa (ej. 'borrador_no_verificado', "
            "'verificado_con_observaciones'). Más granular que nivel_verificacion: cuando ambos "
            "campos difieren en severidad, estado refleja el diagnóstico real de la última "
            "auditoría de contenido y debe primar sobre nivel_verificacion de cara al usuario."
        ),
    )
    aviso: Optional[str] = Field(
        None,
        description="Nota de auditoría en texto libre sobre el estado de verificación de esta normativa, si existe.",
    )
    huecos_verificacion: List[str] = Field(
        default_factory=list,
        description="Huecos de verificación documentados para esta combinación comunidad/tecnología (tasas, umbrales, trámites sin confirmar, etc.).",
    )
    riesgo_normativo: Optional[RiesgoNormativoOutput] = Field(
        None,
        description=(
            "Indicador cualitativo (no predictivo) de riesgo por trámite, derivado de la "
            "severidad de verificación de la normativa y de la completitud de cada trámite "
            "(base legal, plazo legal, documentos requeridos). No es una probabilidad de "
            "rechazo: no existe histórico de motivos de rechazo con el que entrenar un modelo."
        ),
    )
