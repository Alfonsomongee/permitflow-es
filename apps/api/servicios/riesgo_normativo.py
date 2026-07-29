"""
apps/api/servicios/riesgo_normativo.py

Indicador de riesgo normativo por trámite.

Contexto: en una fase anterior se evaluó construir un "scoring de riesgo de
rechazo de expediente" basado en histórico de rechazos reales. Al investigar,
no existe tabla de histórico con motivo de rechazo por trámite (solo el estado
final del expediente: aprobado/rechazado/pendiente, sin trazabilidad de causa
- ver apps/api/models/expediente.py). Construir un score predictivo sin datos
reales de entrenamiento habría sido fabricar otro número sin respaldo, el
mismo problema que ya se corrigió en Estadísticas.

Este módulo hace lo que SÍ se puede justificar con datos reales que ya existen:
combina (a) la severidad de verificación del fichero de normativa completo
(mismo criterio que severidad_verificacion en asistente_context.py y
severidadVerificacion en apps/web/types/plan.ts) con (b) la completitud de cada
trámite individual (¿tiene base legal, documentos requeridos, plazo legal
documentado?). Un trámite sin base legal citada o sin plazo legal conocido es
un trámite con mayor probabilidad real de generar fricción o rechazo -no
porque lo prediga un modelo, sino porque al usuario/organismo le falta
información para tramitarlo bien.

Es deliberadamente conservador: nunca afirma una probabilidad numérica de
rechazo, solo un nivel cualitativo (bajo/medio/alto) con los motivos exactos
que lo justifican, trazables trámite a trámite.
"""

from dataclasses import dataclass, field
from typing import Literal, Optional

NivelRiesgo = Literal["bajo", "medio", "alto"]

_ORDEN_RIESGO: dict[NivelRiesgo, int] = {"bajo": 0, "medio": 1, "alto": 2}


def _severidad_normativa(nivel_verificacion: Optional[str], estado: Optional[str]) -> str:
    """
    Réplica de severidad_verificacion (servicios/asistente_context.py) y
    severidadVerificacion (apps/web/types/plan.ts), operando sobre los valores
    ya extraídos en vez del JSON completo, para no acoplar este módulo a la
    carga de ficheros de normativa.
    """
    estado_str = estado or ""
    if "no_verificado" in estado_str:
        return "critico"
    if nivel_verificacion == "generica":
        return "critico"
    if "parcial" in estado_str or nivel_verificacion in (
        "verificada_parcialmente",
        "verificado_con_observaciones",
        "en_revision",
        "borrador_verificado_parcialmente",
    ):
        return "atencion"
    return "verificada"


def _escalar(actual: NivelRiesgo, nuevo: NivelRiesgo) -> NivelRiesgo:
    return nuevo if _ORDEN_RIESGO[nuevo] > _ORDEN_RIESGO[actual] else actual


@dataclass(frozen=True)
class RiesgoTramite:
    orden: int
    nombre: str
    riesgo: NivelRiesgo
    motivos: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class RiesgoNormativoPlan:
    severidad_normativa: str  # "critico" | "atencion" | "verificada"
    tramites: list[RiesgoTramite]
    resumen: dict[NivelRiesgo, int]
    hay_riesgo_alto: bool


def calcular_riesgo_plan(
    tramites: list[dict],
    nivel_verificacion: Optional[str],
    estado: Optional[str],
) -> RiesgoNormativoPlan:
    """
    tramites: lista de dicts con al menos 'orden', 'nombre', 'base_legal',
    'plazo_legal_dias', 'documentos_requeridos' (lista), 'tipo_actuacion'.
    Acepta tanto dicts planos como objetos con esos atributos (TramiteOutput).
    """
    severidad = _severidad_normativa(nivel_verificacion, estado)

    resultado: list[RiesgoTramite] = []
    resumen: dict[NivelRiesgo, int] = {"bajo": 0, "medio": 0, "alto": 0}

    for t in tramites:
        get = t.get if isinstance(t, dict) else (lambda k, d=None: getattr(t, k, d))

        riesgo: NivelRiesgo = "bajo"
        motivos: list[str] = []

        if severidad == "critico":
            riesgo = _escalar(riesgo, "alto")
            motivos.append("La normativa de origen de este trámite es un borrador sin verificar.")
        elif severidad == "atencion":
            riesgo = _escalar(riesgo, "medio")
            motivos.append("La normativa de origen tiene observaciones pendientes de verificación.")

        base_legal = (get("base_legal") or "").strip()
        if not base_legal or base_legal.upper() == "N/A":
            riesgo = _escalar(riesgo, "alto")
            motivos.append("No hay base legal documentada para este trámite.")

        if get("plazo_legal_dias") is None:
            riesgo = _escalar(riesgo, "medio")
            motivos.append("No se conoce el plazo legal máximo del organismo para este trámite.")

        documentos = get("documentos_requeridos") or []
        tipo_actuacion = get("tipo_actuacion")
        if not documentos and tipo_actuacion not in ("informativa",):
            riesgo = _escalar(riesgo, "medio")
            motivos.append("No hay lista de documentos requeridos asociada a este trámite.")

        resultado.append(
            RiesgoTramite(
                orden=get("orden"),
                nombre=get("nombre"),
                riesgo=riesgo,
                motivos=motivos,
            )
        )
        resumen[riesgo] += 1

    return RiesgoNormativoPlan(
        severidad_normativa=severidad,
        tramites=resultado,
        resumen=resumen,
        hay_riesgo_alto=resumen["alto"] > 0,
    )
