"""Validador pre-presentación: comprobaciones de coherencia sobre los datos del
expediente, definidas en la clave `validaciones` de los JSONs de normativa.

Conviven tres formatos, porque los ficheros se escribieron en momentos distintos.
El validador soporta los tres; la auditoría QA 2026-08-11 (A-05) descubrió que
solo implementaba el primero, así que 18 de las 26 validaciones definidas —todas
las de Madrid y Cataluña— eran código muerto: el panel decía "Sin incidencias ·
3 comprobaciones superadas" cuando ninguna de las tres se había ejecutado. Un
falso positivo tranquilizador en las dos comunidades que la aplicación presenta
como mejor verificadas.

1. **Condición json-logic** — `{condicion, severidad, mensaje, fuente}`.
   La `condicion` describe el PROBLEMA: si evalúa truthy, dispara un hallazgo.
   `campos_requeridos` actúa aquí como guarda: si alguno es None, la validación
   no aplica (json-logic-py evalúa los argumentos de forma eager, así que un
   `and` no protege de operar aritmética sobre nulos).

2. **Campos obligatorios** — `{campos_requeridos, accion_si_faltan}`.
   Sin `condicion`. Aquí `campos_requeridos` no es una guarda sino el objeto de
   la comprobación: si falta alguno, el plan no se puede considerar fiable.
   Se usa para datos que el schema no exige pero de los que dependen reglas de
   esa comunidad (p. ej. `clase_instalacion_gas` en Madrid decide entre
   proyecto técnico y declaración responsable).

3. **Dominio de valor** — `{campo, valores_permitidos, obligatorio}`.
   Comprueba que el valor de un campo está dentro de una lista cerrada.
"""
import logging
from pathlib import Path
from typing import List, Literal, Optional

from json_logic import jsonLogic
from pydantic import BaseModel, Field

from motor_normativo.excepciones import NormativaNoEncontradaError
from motor_normativo.reglas_cache import cargar_json_reglas
from motor_normativo.validaciones_transversales import transversales_para
from schemas.clasificador import ClasificadorInput

logger = logging.getLogger(__name__)


class Hallazgo(BaseModel):
    id: str
    severidad: Literal["error", "aviso"]
    mensaje: str
    fuente: Optional[str] = None


class ValidadorOutput(BaseModel):
    hallazgos: List[Hallazgo] = Field(default_factory=list)
    total_errores: int = 0
    total_avisos: int = 0
    total_definidas: int = 0
    no_evaluables: List[str] = Field(default_factory=list)


def _legible(campo: str) -> str:
    return campo.replace("_", " ")


class Validador:
    def __init__(self, reglas_dir: Optional[Path] = None):
        self.reglas_dir = reglas_dir or (Path(__file__).parent / "reglas")

    def _evaluar(self, v: dict, vid: str, datos: dict) -> Optional[Hallazgo]:
        """Aplica la validación en el formato que corresponda. None = sin hallazgo."""

        # Formato 3: dominio cerrado de un campo.
        if "valores_permitidos" in v:
            campo = v["campo"]
            valor = datos.get(campo)
            if valor is None:
                if not v.get("obligatorio"):
                    return None
                return Hallazgo(
                    id=vid,
                    severidad="error",
                    mensaje=(
                        f"Falta el dato «{_legible(campo)}», necesario para clasificar esta "
                        f"instalación en esta comunidad. Valores admitidos: "
                        f"{', '.join(v['valores_permitidos'])}."
                    ),
                    fuente=v.get("fuente"),
                )
            if valor not in v["valores_permitidos"]:
                return Hallazgo(
                    id=vid,
                    severidad="error",
                    mensaje=(
                        f"El valor «{valor}» no es válido para «{_legible(campo)}». "
                        f"Valores admitidos: {', '.join(v['valores_permitidos'])}."
                    ),
                    fuente=v.get("fuente"),
                )
            return None

        # Formato 2: campos obligatorios sin condición asociada.
        if "condicion" not in v and "accion_si_faltan" in v:
            faltan = [c for c in v.get("campos_requeridos", []) if datos.get(c) is None]
            if not faltan:
                return None
            return Hallazgo(
                id=vid,
                severidad="error",
                mensaje=(
                    "Faltan datos de los que dependen las reglas de esta comunidad: "
                    + ", ".join(f"«{_legible(c)}»" for c in faltan)
                    + ". Sin ellos el plan puede omitir trámites aplicables, así que conviene "
                    "revisarlo con un técnico antes de presentar nada."
                ),
                fuente=v.get("fuente"),
            )

        # Formato 1: condición json-logic. `campos_requeridos` es aquí una guarda.
        campos = v.get("campos_requeridos") or []
        if any(datos.get(campo) is None for campo in campos):
            return None  # no aplica: faltan datos para evaluarla
        if jsonLogic(v.get("condicion", False), datos):
            return Hallazgo(
                id=vid,
                severidad=v.get("severidad") or "aviso",
                mensaje=v.get("mensaje") or "",
                fuente=v.get("fuente"),
            )
        return None

    def validar(self, params: ClasificadorInput) -> ValidadorOutput:
        file_path = (
            self.reglas_dir / params.comunidad / f"{params.tipo_instalacion}.json"
        ).resolve()

        if not file_path.is_relative_to(self.reglas_dir.resolve()) or not file_path.exists():
            raise NormativaNoEncontradaError(
                f"No se encontró normativa para {params.tipo_instalacion} en {params.comunidad}"
            )

        data = cargar_json_reglas(file_path)

        # Las de base estatal se añaden a las de la comunidad. Sin ellas, 60 de
        # las 85 combinaciones no comprobaban absolutamente nada (auditoría QA
        # 2026-08-11, A-05), aunque parte de lo que hay que comprobar no depende
        # de la comunidad. Ver motor_normativo/validaciones_transversales.py.
        validaciones = list(data.get("validaciones", []))
        validaciones.extend(transversales_para(params.tipo_instalacion))
        eval_locals = params.model_dump()

        hallazgos: list[Hallazgo] = []
        no_evaluables: list[str] = []

        for v in validaciones:
            vid = v.get("id", "sin-id")
            try:
                hallazgo = self._evaluar(v, vid, eval_locals)
            except Exception as e:  # noqa: BLE001 — definición malformada
                logger.error(
                    f"Validación {vid} no evaluable en "
                    f"{params.comunidad}/{params.tipo_instalacion}: {e}"
                )
                no_evaluables.append(vid)
                continue
            if hallazgo is not None:
                hallazgos.append(hallazgo)

        hallazgos.sort(key=lambda h: 0 if h.severidad == "error" else 1)
        return ValidadorOutput(
            hallazgos=hallazgos,
            total_errores=sum(1 for h in hallazgos if h.severidad == "error"),
            total_avisos=sum(1 for h in hallazgos if h.severidad == "aviso"),
            total_definidas=len(validaciones),
            no_evaluables=no_evaluables,
        )
