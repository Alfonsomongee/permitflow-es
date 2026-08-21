"""silencio_administrativo: campo opcional por trámite (Ley 39/2015, art. 24)
que indica el efecto legal si el organismo no resuelve dentro de
plazo_legal_dias. Origen: hoja de ruta de producto 2026-08-21 (PREM-06,
prioridad #1) -- deliberadamente sin inferencia automática ni valor por
defecto, exactamente como nivel_verificacion/huecos_verificacion: si no
está verificado a mano para un trámite concreto, se queda en None en vez
de afirmar un efecto legal sin respaldo.
"""
import json

import pytest
from pydantic import ValidationError

from motor_normativo.clasificador import Clasificador
from schemas.clasificador import ClasificadorInput, TramiteOutput


def _tramite(orden, silencio=None):
    return {
        "orden": orden, "nombre": f"Trámite {orden}", "organismo": "Organismo X",
        "base_legal": "Norma Y", "plazo_estimado_dias": 30, "plazo_legal_dias": 30,
        "documentos_requeridos": [], "notas": None, "plataforma": None,
        "silencio_administrativo": silencio,
    }


@pytest.fixture
def reglas_dir(tmp_path):
    data = {
        "tipo_instalacion": "acs",
        "comunidad": "andalucia",
        "reglas": [
            {
                "id": "R1",
                "condicion": True,
                "tramites": [
                    _tramite(1, silencio="positivo"),
                    _tramite(2, silencio="negativo"),
                    _tramite(3, silencio=None),
                ],
            },
        ],
    }
    destino = tmp_path / "andalucia"
    destino.mkdir()
    (destino / "acs.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return tmp_path


def _params(**overrides):
    base = dict(
        tipo_instalacion="acs", comunidad="andalucia", potencia_kw=3,
        uso="residencial", uso_colectivo=False,
    )
    base.update(overrides)
    return ClasificadorInput(**base)


def test_silencio_administrativo_se_propaga_desde_la_regla(reglas_dir):
    clasificador = Clasificador()
    clasificador.reglas_dir = reglas_dir

    resultado = clasificador.clasificar(_params())
    assert len(resultado.tramites) == 3

    por_orden = {t.orden: t.silencio_administrativo for t in resultado.tramites}
    assert por_orden == {1: "positivo", 2: "negativo", 3: None}


def test_tramite_output_acepta_positivo_negativo_y_ausente():
    for valor in ("positivo", "negativo", None):
        t = TramiteOutput(
            orden=1, nombre="T", organismo="O", base_legal="B",
            plazo_estimado_dias=None, plazo_legal_dias=30,
            silencio_administrativo=valor,
        )
        assert t.silencio_administrativo == valor


def test_tramite_output_rechaza_un_valor_que_no_sea_positivo_o_negativo():
    with pytest.raises(ValidationError):
        TramiteOutput(
            orden=1, nombre="T", organismo="O", base_legal="B",
            plazo_estimado_dias=None, plazo_legal_dias=30,
            silencio_administrativo="quizas",
        )
