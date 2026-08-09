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
