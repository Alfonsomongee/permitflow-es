"""Validador pre-presentación: comprobaciones de coherencia sobre los datos del
expediente, definidas en la clave `validaciones` de los JSONs de normativa.

Semántica: la `condicion` (json-logic) describe el PROBLEMA — si evalúa truthy,
la validación dispara un hallazgo. `campos_requeridos` actúa como guarda: si
alguno es None, la validación no aplica (json-logic-py evalúa argumentos de
forma eager, así que un `and` no protege de operar aritmética sobre nulos).
"""
import json
import logging
from pathlib import Path
from typing import List, Literal, Optional

from json_logic import jsonLogic
from pydantic import BaseModel, Field

from motor_normativo.excepciones import NormativaNoEncontradaError
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


class Validador:
    def __init__(self, reglas_dir: Optional[Path] = None):
        self.reglas_dir = reglas_dir or (Path(__file__).parent / "reglas")

    def validar(self, params: ClasificadorInput) -> ValidadorOutput:
        file_path = (
            self.reglas_dir / params.comunidad / f"{params.tipo_instalacion}.json"
        ).resolve()

        if not file_path.is_relative_to(self.reglas_dir.resolve()) or not file_path.exists():
            raise NormativaNoEncontradaError(
                f"No se encontró normativa para {params.tipo_instalacion} en {params.comunidad}"
            )

        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        validaciones = data.get("validaciones", [])
        eval_locals = params.model_dump()

        hallazgos: list[Hallazgo] = []
        no_evaluables: list[str] = []

        for v in validaciones:
            vid = v.get("id", "sin-id")
            campos = v.get("campos_requeridos", [])
            if any(eval_locals.get(campo) is None for campo in campos):
                continue  # no aplica: faltan datos para evaluarla

            try:
                if jsonLogic(v.get("condicion", False), eval_locals):
                    hallazgos.append(Hallazgo(
                        id=vid,
                        severidad=v.get("severidad", "aviso"),
                        mensaje=v.get("mensaje", ""),
                        fuente=v.get("fuente"),
                    ))
            except Exception as e:  # noqa: BLE001 — condición malformada
                logger.error(
                    f"Validación {vid} no evaluable en "
                    f"{params.comunidad}/{params.tipo_instalacion}: {e}"
                )
                no_evaluables.append(vid)

        hallazgos.sort(key=lambda h: 0 if h.severidad == "error" else 1)
        return ValidadorOutput(
            hallazgos=hallazgos,
            total_errores=sum(1 for h in hallazgos if h.severidad == "error"),
            total_avisos=sum(1 for h in hallazgos if h.severidad == "aviso"),
            total_definidas=len(validaciones),
            no_evaluables=no_evaluables,
        )
