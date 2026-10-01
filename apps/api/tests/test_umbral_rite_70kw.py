"""Frontera de 70 kW del RITE (RD 1027/2007, art. 15.1).

  a) potencia térmica nominal MAYOR que 70 kW      -> proyecto
  b) de 5 kW a 70 kW, ambos INCLUIDOS               -> memoria técnica

Cuatro comunidades (Aragón, Baleares, Cataluña y Madrid) tenían `>= 70` para el
proyecto y `< 70` para la memoria: a 70,0 kW exigían proyecto cuando el RITE solo
exige memoria técnica. Las otras trece ya usaban `> 70` / `<= 70`. Este test
recorre los 34 ficheros de ACS y climatización para que ninguna comunidad vuelva a
desviarse.
"""
import json
from pathlib import Path

import pytest

REGLAS = Path(__file__).resolve().parent.parent / "motor_normativo" / "reglas"
FICHEROS = sorted(
    p for tipo in ("acs", "climatizacion_aerotermia") for p in REGLAS.glob(f"*/{tipo}.json")
)


def _comparaciones_70(nodo, acc):
    if isinstance(nodo, dict):
        for operador, args in nodo.items():
            if (
                isinstance(args, list)
                and len(args) == 2
                and isinstance(args[0], dict)
                and args[0].get("var") == "potencia_kw"
                and args[1] == 70
            ):
                acc.append(operador)
            _comparaciones_70(args, acc)
    elif isinstance(nodo, list):
        for item in nodo:
            _comparaciones_70(item, acc)


def test_hay_ficheros_que_comprobar():
    assert len(FICHEROS) == 34


@pytest.mark.parametrize("fichero", FICHEROS, ids=lambda p: f"{p.parent.name}/{p.stem}")
def test_la_frontera_de_70kw_excluye_el_propio_70(fichero):
    data = json.loads(fichero.read_text(encoding="utf-8"))
    operadores: list[str] = []
    for regla in data["reglas"]:
        _comparaciones_70(regla.get("condicion"), operadores)
    for validacion in data.get("validaciones", []):
        _comparaciones_70(validacion.get("condicion"), operadores)

    # Solo `>` (proyecto) y `<=` (memoria) son coherentes con "mayor que 70".
    # (`<=` y `>` también aparecen en las exenciones de ACS, que son "hasta 70 kW".)
    incorrectos = [op for op in operadores if op in (">=", "<")]
    assert not incorrectos, (
        f"{fichero.parent.name}/{fichero.name}: comparación con 70 kW incorrecta {incorrectos}; "
        "el RITE (art. 15.1) exige proyecto solo por ENCIMA de 70 kW"
    )
