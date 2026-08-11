"""Linter estático de los JSON del motor normativo (motor_normativo/reglas/).

Comprobaciones de forma y coherencia interna de cada fichero -- no requieren
casos de prueba ni invocar al Clasificador, así que corren en milisegundos y
se pueden ejecutar en cada `pytest` (ver tests/test_motor_normativo_lint.py).

Motivación: AND-FV-003 (Andalucía, fotovoltaica_autoconsumo.json) repitió el
trámite "Solicitud del CAU" dos veces dentro de la misma regla -- un bug que
pasó desapercibido hasta una auditoría manual porque nada lo comprobaba de
forma automática. Este módulo generaliza esa comprobación (y varias más ya
existentes en el antiguo scripts/ci_check_json.py, que solo las hacía
bloqueantes para Madrid y Cataluña) a los 85 ficheros por igual, para que un
futuro edit -- humano o de un agente delegado -- no pueda reintroducir la
misma clase de error sin que la suite lo note.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

STANDARD_JSON_LOGIC_OPERATORS = {
    "==", "===", "!=", "!==", ">", ">=", "<", "<=", "!", "!!",
    "or", "and", "var", "in", "cat", "map", "reduce", "filter",
    "all", "none", "some", "merge", "substr", "+", "-", "*", "/",
    "%", "min", "max", "if", "missing", "missing_some",
}


@dataclass
class Hallazgo:
    fichero: str
    mensaje: str

    def __str__(self) -> str:
        return f"{self.fichero}: {self.mensaje}"


def _check_logic_issues(node: Any, path: str) -> list[str]:
    errores: list[str] = []
    if isinstance(node, dict):
        for k, v in node.items():
            if k == "":
                errores.append(f"Operador vacío '' en {path}")
            elif k == "not":
                errores.append(f"Operador inválido 'not' en {path} (usar '!')")
            elif k not in STANDARD_JSON_LOGIC_OPERATORS:
                errores.append(f"Operador JSONLogic desconocido '{k}' en {path}")
            errores.extend(_check_logic_issues(v, f"{path}/{k}"))
    elif isinstance(node, list):
        for i, item in enumerate(node):
            errores.extend(_check_logic_issues(item, f"{path}[{i}]"))
    return errores


def _lint_fichero(rel: str, data: dict) -> list[Hallazgo]:
    hallazgos: list[Hallazgo] = []
    reglas = data.get("reglas", [])

    rule_ids_in_file = {r.get("id") for r in reglas if r.get("id")}
    rule_ids_seen: set[str] = set()

    for regla in reglas:
        rule_id = regla.get("id", "unknown")
        if rule_id in rule_ids_seen:
            hallazgos.append(Hallazgo(rel, f"ID de regla duplicado: {rule_id}"))
        rule_ids_seen.add(rule_id)

        for err in _check_logic_issues(regla.get("condicion", {}), f"regla {rule_id} -> condicion"):
            hallazgos.append(Hallazgo(rel, err))

        # Trámites duplicados (mismo nombre) u orden repetido DENTRO de la
        # misma regla -- la clase de bug real de AND-FV-003.
        nombres_seen: dict[str, Any] = {}
        ordenes_seen: dict[Any, str] = {}

        for tramite in regla.get("tramites", []):
            nombre = tramite.get("nombre")
            orden = tramite.get("orden")

            if nombre in nombres_seen:
                hallazgos.append(Hallazgo(
                    rel,
                    f"regla {rule_id}: trámite duplicado '{nombre}' "
                    f"(orden {nombres_seen[nombre]} y {orden})",
                ))
            else:
                nombres_seen[nombre] = orden

            if orden in ordenes_seen:
                hallazgos.append(Hallazgo(
                    rel,
                    f"regla {rule_id}: orden {orden} repetido entre "
                    f"'{ordenes_seen[orden]}' y '{nombre}'",
                ))
            else:
                ordenes_seen[orden] = nombre

            t_regla_id = tramite.get("regla_id")
            if t_regla_id and t_regla_id not in rule_ids_in_file:
                hallazgos.append(Hallazgo(
                    rel, f"regla_id inválido/inexistente '{t_regla_id}' en trámite '{nombre}'"
                ))

            p_url = tramite.get("plataforma_url")
            if p_url:
                if p_url.strip().rstrip("/") == "https://canalempresa.gencat.cat":
                    hallazgos.append(Hallazgo(rel, f"URL genérica de Canal Empresa en '{nombre}'"))
                if "<a" in p_url or "</a>" in p_url or ">" in p_url.strip():
                    hallazgos.append(Hallazgo(rel, f"HTML en plataforma_url de '{nombre}'"))
                if p_url.endswith("`"):
                    hallazgos.append(Hallazgo(rel, f"Backtick final en plataforma_url de '{nombre}'"))

            doc_ids_seen: set[str] = set()
            for doc in tramite.get("documentos_requeridos", []):
                doc_id = doc.get("id")
                if doc_id:
                    if doc_id in doc_ids_seen:
                        hallazgos.append(Hallazgo(
                            rel, f"ID de documento duplicado '{doc_id}' en trámite '{nombre}' (regla {rule_id})"
                        ))
                    doc_ids_seen.add(doc_id)
                if "condicion_documento" in doc:
                    for err in _check_logic_issues(
                        doc["condicion_documento"], f"regla {rule_id} -> doc {doc_id or '?'}"
                    ):
                        hallazgos.append(Hallazgo(rel, err))

    if '"notes"' in json.dumps(data):
        hallazgos.append(Hallazgo(rel, "Campo legacy 'notes' encontrado; usar 'notas'"))

    hallazgos.extend(_lint_valores_de_enum(rel, data))
    return hallazgos


# Valores admisibles de los campos de tipo enum, tomados de schemas/clasificador.py.
# Se declaran aquí (y no se importan) porque el linter debe poder correr sobre el
# árbol de reglas sin arrancar el resto del backend; el test
# tests/test_motor_normativo_lint.py comprueba que ambas listas coinciden.
VALORES_ENUM: dict[str, set[str]] = {
    "uso": {"residencial", "terciario", "industrial"},
    "modo_recarga": {"1", "2", "3", "4"},
    "tipo_instalacion": {
        "fotovoltaica_autoconsumo", "irve", "climatizacion_aerotermia",
        "acs", "gas_baja_presion",
    },
    "modalidad_autoconsumo": {
        "sin_excedentes", "con_excedentes_sin_compensacion",
        "con_excedentes_con_compensacion",
    },
    "clase_instalacion_gas": {"individual", "comun", "conexion_servicio"},
    "uso_edificio": {"residencial", "no_residencial"},
    "ventilacion_garaje": {"natural", "forzada"},
    "ubicacion_suelo": {"urbanizado", "no_urbanizable"},
    "nivel_tension_consumidor": {"bt", "at"},
    "nivel_tension_generacion": {"bt", "at"},
    "nivel_tension_conexion": {"bt", "at"},
    "combustible_gas": {"gas_natural", "glp"},
}


def _comparaciones_con_literal(node: Any, acc: list[tuple[str, Any]]) -> None:
    """Recolecta las comparaciones `{"=="|"!=": [{"var": X}, literal]}`."""
    if isinstance(node, dict):
        for op, args in node.items():
            if op in ("==", "!=", "===", "!==") and isinstance(args, list) and len(args) == 2:
                for x, y in ((args[0], args[1]), (args[1], args[0])):
                    if isinstance(x, dict) and "var" in x and isinstance(y, str):
                        nombre = x["var"][0] if isinstance(x["var"], list) else x["var"]
                        if isinstance(nombre, str):
                            acc.append((nombre, y))
            _comparaciones_con_literal(args, acc)
    elif isinstance(node, list):
        for item in node:
            _comparaciones_con_literal(item, acc)


def _lint_valores_de_enum(rel: str, data: dict) -> list[Hallazgo]:
    """Detecta comparaciones contra valores que el schema nunca puede producir.

    json-logic no da error al comparar contra un valor imposible: la condición
    simplemente evalúa a falso siempre, y la rama queda muerta sin que nada lo
    señale. La auditoría QA 2026-08-11 encontró dos casos así en producción:
    `uso == "comercial"` (el enum solo tiene residencial/terciario/industrial),
    que dejaba el uso terciario de Canarias devolviendo un 404 de "sin
    normativa"; y `combustible == "gas"` en una validación de Andalucía, que
    por eso no saltaba nunca.
    """
    hallazgos: list[Hallazgo] = []
    comparaciones: list[tuple[str, Any]] = []

    for regla in data.get("reglas", []):
        _comparaciones_con_literal(regla.get("condicion"), comparaciones)
    for validacion in data.get("validaciones", []):
        _comparaciones_con_literal(validacion.get("condicion"), comparaciones)

    for campo, valor in comparaciones:
        admisibles = VALORES_ENUM.get(campo)
        if admisibles and valor not in admisibles:
            hallazgos.append(Hallazgo(
                rel,
                f"Valor imposible en condición: {campo} == '{valor}'. "
                f"El schema solo admite {sorted(admisibles)}, así que esta rama "
                f"nunca se activa (json-logic no avisa: evalúa a falso en silencio)."
            ))
    return hallazgos


def lint_reglas_dir(reglas_dir: Path) -> list[Hallazgo]:
    """Recorre reglas_dir/**/*.json y devuelve todos los hallazgos de
    coherencia encontrados. Lista vacía == sin problemas."""
    hallazgos: list[Hallazgo] = []
    for filepath in sorted(reglas_dir.rglob("*.json")):
        if filepath.name.startswith("_"):
            continue
        rel = str(filepath.relative_to(reglas_dir))
        try:
            data = json.loads(filepath.read_text(encoding="utf-8"))
        except Exception as exc:  # noqa: BLE001 -- fichero malformado es el propio hallazgo
            hallazgos.append(Hallazgo(rel, f"Error de parseo JSON: {exc}"))
            continue
        hallazgos.extend(_lint_fichero(rel, data))
    return hallazgos
