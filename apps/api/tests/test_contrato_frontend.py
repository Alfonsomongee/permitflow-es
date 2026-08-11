"""Test de contrato entre el motor normativo y el frontend.

Origen: auditoría QA 2026-08-11, hallazgo C-01. El proxy Next.js
(`apps/web/app/api/clasificar/route.ts`) enumeraba a mano los campos que enviaba
al motor y se quedó 9 campos por detrás de `ClasificadorInput`. Como json-logic
evalúa una variable ausente como *falsy*, las reglas que dependían de esos campos
nunca se disparaban: la rama negativa ganaba en silencio y el plan salía
incompleto sin ningún aviso al usuario.

Estos tests cierran el círculo en las dos direcciones:

1. Todo campo declarado en el constructor de payload del frontend existe en
   `ClasificadorInput` (no se envía basura).
2. Toda variable que alguna regla o validación de los JSON usa es un campo del
   schema Y es enviable desde el frontend (ninguna regla queda inalcanzable).

Se leen los ficheros TypeScript como texto a propósito: es la única forma de
verificar el contrato real sin montar un runtime de Node en la suite de Python,
y basta porque las listas del constructor son literales planos.
"""
import json
import re
from pathlib import Path

import pytest

from schemas.clasificador import ClasificadorInput

RAIZ = Path(__file__).resolve().parents[3]
PAYLOAD_TS = RAIZ / "apps" / "web" / "lib" / "clasificador-payload.ts"
REGLAS_DIR = Path(__file__).resolve().parents[1] / "motor_normativo" / "reglas"

# Variables internas que el clasificador inyecta durante la normalización y que
# por tanto no proceden del formulario (ver clasificador.py::normalizar_parametros).
VARIABLES_INTERNAS = {"_conflicto_tension", "_falta_tension"}


def _lista_ts(nombre: str) -> set[str]:
    """Extrae los strings de una constante `export const NOMBRE = [...] as const`."""
    texto = PAYLOAD_TS.read_text(encoding="utf-8")
    match = re.search(
        rf"export const {nombre}\s*=\s*\[(.*?)\]\s*as const;",
        texto,
        re.DOTALL,
    )
    assert match, f"No se encontró la constante {nombre} en {PAYLOAD_TS.name}"
    return set(re.findall(r'"([^"]+)"', match.group(1)))


@pytest.fixture(scope="module")
def campos_enviables() -> set[str]:
    """Campos que el frontend es capaz de enviar al motor normativo."""
    return (
        _lista_ts("CAMPOS_STRING")
        | _lista_ts("CAMPOS_NUMERO")
        | _lista_ts("CAMPOS_ENTERO")
        | _lista_ts("CAMPOS_BOOLEAN")
    )


@pytest.fixture(scope="module")
def variables_usadas() -> dict[str, set[str]]:
    """Variable json-logic -> conjunto de '<ccaa>/<vertical>:<regla_id>' que la usan."""
    usos: dict[str, set[str]] = {}

    def recorrer(nodo, origen: str) -> None:
        if isinstance(nodo, dict):
            for clave, valor in nodo.items():
                if clave == "var":
                    nombre = valor[0] if isinstance(valor, list) and valor else valor
                    if isinstance(nombre, str):
                        usos.setdefault(nombre, set()).add(origen)
                recorrer(valor, origen)
        elif isinstance(nodo, list):
            for item in nodo:
                recorrer(item, origen)

    for fichero in sorted(REGLAS_DIR.glob("*/*.json")):
        etiqueta = f"{fichero.parent.name}/{fichero.stem}"
        data = json.loads(fichero.read_text(encoding="utf-8"))
        for regla in data.get("reglas", []):
            recorrer(regla.get("condicion"), f"{etiqueta}:{regla.get('id')}")
        for validacion in data.get("validaciones", []):
            recorrer(validacion.get("condicion"), f"{etiqueta}:{validacion.get('id')}")

    return usos


def test_todos_los_campos_enviables_existen_en_el_schema(campos_enviables):
    """El frontend no debe declarar campos que el motor no conoce."""
    desconocidos = campos_enviables - set(ClasificadorInput.model_fields)
    assert not desconocidos, (
        "clasificador-payload.ts declara campos que no existen en ClasificadorInput: "
        f"{sorted(desconocidos)}"
    )


def test_toda_variable_de_las_reglas_existe_en_el_schema(variables_usadas):
    """Una variable mal escrita en un JSON se evalúa como falsy sin avisar."""
    del_schema = set(ClasificadorInput.model_fields) | VARIABLES_INTERNAS
    huerfanas = {v: sorted(o) for v, o in variables_usadas.items() if v not in del_schema}
    assert not huerfanas, (
        "Hay reglas que usan variables inexistentes en ClasificadorInput (json-logic "
        f"las evaluará como falsy sin error): {json.dumps(huerfanas, indent=2, ensure_ascii=False)}"
    )


def test_toda_variable_de_las_reglas_es_enviable_desde_el_frontend(
    campos_enviables, variables_usadas
):
    """Regresión de C-01: ninguna regla puede quedar inalcanzable desde la app.

    Si una variable se usa en una condición pero el formulario no puede enviarla,
    la rama que depende de ella nunca se activa en producción, aunque los tests
    del motor (que llaman al clasificador directamente) sí la cubran.
    """
    enviables = campos_enviables | VARIABLES_INTERNAS
    inalcanzables = {
        variable: sorted(origenes)
        for variable, origenes in variables_usadas.items()
        if variable not in enviables
    }
    assert not inalcanzables, (
        "Estas variables se usan en reglas pero el frontend no puede enviarlas, así que "
        "esas reglas nunca se dispararán desde la aplicación:\n"
        + json.dumps(inalcanzables, indent=2, ensure_ascii=False)
    )


def test_mapa_de_campos_condicionales_esta_al_dia():
    """`campos_condicionales.ts` se genera desde las condiciones de los JSON.

    Si alguien cambia una condición del motor y no regenera el fichero, el
    formulario dejará de preguntar un campo que las reglas sí necesitan — que es
    exactamente el mecanismo de C-01. Este test compara el contenido en disco con
    el que produciría el generador ahora mismo.
    """
    import importlib.util

    script = RAIZ / "scripts" / "generar_campos_condicionales.py"
    salida = RAIZ / "apps" / "web" / "content" / "campos_condicionales.ts"
    assert salida.exists(), "Falta campos_condicionales.ts: ejecuta el generador"

    spec = importlib.util.spec_from_file_location("generar_campos_condicionales", script)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)

    antes = salida.read_text(encoding="utf-8")
    modulo.main()
    despues = salida.read_text(encoding="utf-8")

    if antes != despues:
        salida.write_text(antes, encoding="utf-8")  # no dejar el árbol sucio
    assert antes == despues, (
        "apps/web/content/campos_condicionales.ts está desactualizado respecto a las "
        "reglas del motor. Ejecuta: python3 scripts/generar_campos_condicionales.py"
    )


def test_el_proxy_usa_el_constructor_declarativo():
    """Evita que alguien vuelva a enumerar los campos a mano en la ruta."""
    ruta = RAIZ / "apps" / "web" / "app" / "api" / "clasificar" / "route.ts"
    contenido = ruta.read_text(encoding="utf-8")
    assert "construirPayloadClasificador(formState)" in contenido, (
        "route.ts debe construir el payload con construirPayloadClasificador() en vez "
        "de enumerar los campos a mano (auditoría QA 2026-08-11, C-01)."
    )
