"""Prompt C (2026-10-02): gas sin comunicación por debajo de los umbrales de proyecto
(Aragón y Cataluña) y autorización de explotación de 100 a 500 kW en Aragón (ADR 0003)."""
import pytest

from motor_normativo.clasificador import Clasificador
from schemas.clasificador import ClasificadorInput

TRAMITE_33 = "Trámite Nº 33"


def _clasificar(**kw):
    return Clasificador().clasificar(ClasificadorInput(**kw))


def _gas_aragon(potencia, presion="normal"):
    return _clasificar(
        tipo_instalacion="gas_baja_presion", comunidad="aragon", potencia_kw=potencia,
        uso="residencial", tension="BT", municipio="Zaragoza", presion_bar=presion,
    )


@pytest.mark.parametrize("potencia", [10, 40, 70])
def test_aragon_gas_hasta_70kw_no_comunica(potencia):
    res = _gas_aragon(potencia)
    assert not any(TRAMITE_33 in t.nombre for t in res.tramites)
    assert {t.regla_id for t in res.tramites} == {"ARA-GAS-001"}


def test_aragon_gas_mas_de_70kw_si_comunica():
    res = _gas_aragon(70.01)
    assert any(TRAMITE_33 in t.nombre for t in res.tramites)


def test_aragon_gas_alta_presion_si_comunica():
    res = _gas_aragon(40, presion="5+")
    assert any(TRAMITE_33 in t.nombre for t in res.tramites)


def test_cataluna_gas_sin_proyecto_es_informativo():
    res = _clasificar(
        tipo_instalacion="gas_baja_presion", comunidad="cataluna", potencia_kw=50,
        uso="residencial", clase_instalacion_gas="individual",
        presion_resultante_bar=0.1, potencia_resultante_kw=50, es_ampliacion=False,
    )
    assert [t.tipo_actuacion for t in res.tramites] == ["informativa"]
    assert "declaració" not in res.tramites[0].nombre.lower()


def test_cataluna_gas_con_proyecto_sigue_presentando_declaracion():
    res = _clasificar(
        tipo_instalacion="gas_baja_presion", comunidad="cataluna", potencia_kw=71,
        uso="residencial", clase_instalacion_gas="individual",
        presion_resultante_bar=0.1, potencia_resultante_kw=71, es_ampliacion=False,
    )
    assert any("declaració" in t.nombre.lower() for t in res.tramites)


def _fv_aragon(potencia):
    return _clasificar(
        tipo_instalacion="fotovoltaica_autoconsumo", comunidad="aragon",
        potencia_kw=potencia, uso="industrial", tension="BT", municipio="Zaragoza",
    )


@pytest.mark.parametrize("potencia,esperado", [(100, False), (100.01, True), (500, True), (500.01, False)])
def test_aragon_fv_autorizacion_explotacion_100_500(potencia, esperado):
    ids = {t.regla_id for t in _fv_aragon(potencia).tramites}
    assert ("ARA-FV-EXPLOTACION-100-500" in ids) is esperado
