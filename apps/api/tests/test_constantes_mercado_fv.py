"""servicios/constantes_mercado_fv.json es la fuente única de las constantes
de mercado (no normativas) de fotovoltaica residencial, compartida con
apps/web/content/benchmarks_fv.ts (generado desde el mismo JSON con
scripts/generar_benchmarks_fv.py). Antes estos números vivían hardcodeados
por duplicado en calculo_financiero.py y benchmarks_fv.ts, sincronizados
solo por un comentario pidiéndolo. Plan de acción consolidado 2026-08-12,
P-17.
"""

import json
from pathlib import Path

from servicios.calculo_financiero import (
    COSTE_EUR_KWP_RESIDENCIAL_MAX,
    COSTE_EUR_KWP_RESIDENCIAL_MIN,
    PRECIO_KWH_EUR,
    PRECIO_KWH_FUENTE,
    RATIO_AUTOCONSUMO_MAX,
    RATIO_AUTOCONSUMO_MIN,
)

RUTA_JSON = Path(__file__).parent.parent / "servicios" / "constantes_mercado_fv.json"


def _cargar_json():
    return json.loads(RUTA_JSON.read_text(encoding="utf-8"))


def test_constantes_del_modulo_coinciden_con_el_json_fuente():
    """Si alguien vuelve a hardcodear un literal en calculo_financiero.py en
    vez de leerlo del JSON, este test lo detecta comparando ambos valores
    directamente -- no solo que el módulo importe sin error."""
    datos = _cargar_json()

    assert PRECIO_KWH_EUR == datos["precio_kwh_defecto"]["valor"]
    assert PRECIO_KWH_FUENTE == datos["precio_kwh_defecto"]["fuente"]
    assert COSTE_EUR_KWP_RESIDENCIAL_MIN == datos["coste_eur_por_kwp"]["residencial"]["min"]
    assert COSTE_EUR_KWP_RESIDENCIAL_MAX == datos["coste_eur_por_kwp"]["residencial"]["max"]
    assert RATIO_AUTOCONSUMO_MIN == datos["ratio_autoconsumo_sin_bateria"]["min"]
    assert RATIO_AUTOCONSUMO_MAX == datos["ratio_autoconsumo_sin_bateria"]["max"]


def test_json_fuente_tiene_las_claves_que_el_generador_de_ts_espera():
    """Guarda mínima para scripts/generar_benchmarks_fv.py: si alguien quita
    una de estas claves del JSON, el .ts generado perdería un campo que
    components/orientacion/SimuladorAhorro.tsx sigue esperando."""
    datos = _cargar_json()
    assert "m2_por_kwp" in datos
    assert "coste_eur_por_kwp" in datos
    assert "industrial_cubierta" in datos["coste_eur_por_kwp"]
    assert "ratio_autoconsumo_sin_bateria" in datos
    assert "precio_kwh_defecto" in datos
