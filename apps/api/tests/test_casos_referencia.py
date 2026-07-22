import json
from pathlib import Path
import pytest
from motor_normativo.clasificador import Clasificador
from schemas.clasificador import ClasificadorInput

CASOS_DIR = Path(__file__).parent / "casos_referencia"

def cargar_casos():
    return [json.loads(p.read_text(encoding="utf-8")) for p in sorted(CASOS_DIR.glob("*.json"))]

@pytest.mark.parametrize("caso", cargar_casos(), ids=lambda c: c["descripcion"])
def test_caso_referencia(caso):
    clasificador = Clasificador()
    resultado = clasificador.clasificar(ClasificadorInput(**caso["input"]))

    assert len(resultado.tramites) == caso["num_tramites_esperado"], (
        f"Trámites: esperados {caso['num_tramites_esperado']}, "
        f"obtenidos {len(resultado.tramites)} → {[t.nombre for t in resultado.tramites]}"
    )
    assert resultado.tiempo_total_estimado_dias == caso["tiempo_total_esperado_dias"]

    # El motor no debe haber fallado al evaluar ninguna regla
    assert not any("regla(s) del motor normativo" in w for w in resultado.advertencias), (
        f"El motor reporta reglas con error de evaluación: "
        f"{[w for w in resultado.advertencias if 'regla(s)' in w]}"
    )

    # El motor aditivo debe reasignar órdenes secuenciales sin saltos
    assert [t.orden for t in resultado.tramites] == list(range(1, len(resultado.tramites) + 1)), (
        "El reordenamiento secuencial del motor aditivo se ha roto"
    )

    # No deben aparecer trámites duplicados (dos reglas que matchean el mismo trámite)
    nombres = [t.nombre for t in resultado.tramites]
    duplicados = {n for n in nombres if nombres.count(n) > 1}
    assert not duplicados, f"Trámite duplicado en el resultado: {duplicados}"
