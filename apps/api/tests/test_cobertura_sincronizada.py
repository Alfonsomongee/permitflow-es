"""apps/web/content/cobertura_normativa.ts se GENERA desde los JSON del motor.

Auditoría 2026-10-01: el fichero generado estaba desfasado respecto a los JSON
(p. ej. nº de huecos de Andalucía) y la web mostraba cifras de cobertura que ya no
coincidían con el contenido real. Este test falla si alguien edita las reglas sin
volver a ejecutar `python3 scripts/generar_cobertura_normativa.py`.
"""
import importlib.util
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[3]


def _generador():
    ruta = RAIZ / "scripts" / "generar_cobertura_normativa.py"
    spec = importlib.util.spec_from_file_location("generar_cobertura_normativa", ruta)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


def test_cobertura_normativa_ts_esta_sincronizada_con_los_json():
    generador = _generador()
    esperado, total = generador.generar()
    actual = (RAIZ / "apps" / "web" / "content" / "cobertura_normativa.ts").read_text(encoding="utf-8")
    assert total == 85
    assert actual == esperado, (
        "content/cobertura_normativa.ts está desfasado respecto a motor_normativo/reglas. "
        "Regenera con: python3 scripts/generar_cobertura_normativa.py"
    )
