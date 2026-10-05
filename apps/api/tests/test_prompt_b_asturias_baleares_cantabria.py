"""Prompt B (2026-10-05): Asturias, Baleares y Cantabria (ADR 0007)."""
import pytest

from motor_normativo.clasificador import Clasificador
from schemas.clasificador import ClasificadorInput


def _c(**kw):
    return Clasificador().clasificar(ClasificadorInput(**kw))


def _ids(res):
    return {t.regla_id for t in res.tramites}


def _fv(com, p, **kw):
    return _c(tipo_instalacion="fotovoltaica_autoconsumo", comunidad=com, potencia_kw=p, uso="residencial",
              tension="BT", municipio="X", implantacion="cubierta", **kw)


def _gas(com, p, uso="residencial", presion="normal"):
    return _c(tipo_instalacion="gas_baja_presion", comunidad=com, potencia_kw=p, uso=uso,
              tension="BT", municipio="X", presion_bar=presion)


@pytest.mark.parametrize("com,mem,proy", [("baleares", "BAL-FV-001", "BAL-FV-001P"),
                                          ("cantabria", "CANT-FV-001", "CANT-FV-001P")])
def test_fv_memoria_hasta_10kw_proyecto_despues(com, mem, proy):
    assert mem in _ids(_fv(com, 10)) and proy not in _ids(_fv(com, 10))
    assert proy in _ids(_fv(com, 10.01)) and mem not in _ids(_fv(com, 10.01))
    assert proy in _ids(_fv(com, 100))


def test_baleares_proyecto_sin_autorizacion_hasta_500kw():
    assert "BAL-FV-001P" in _ids(_fv("baleares", 500))
    assert "BAL-FV-002" not in _ids(_fv("baleares", 500))
    assert "BAL-FV-002" in _ids(_fv("baleares", 501))


def test_baleares_autorizacion_500kw_es_tramite_propio():
    t = [x for x in _fv("baleares", 600).tramites if x.regla_id == "BAL-FV-002" and "500 kW" in x.nombre]
    assert t and "2807998" in (t[0].plataforma_url or "")


def test_asturias_fv_tramos_10_25_y_oca_por_encima_de_25kw():
    kw = dict(modalidad_autoconsumo="con_excedentes_con_compensacion")
    assert "AST-FV-001-A" in _ids(_fv("asturias", 10, **kw))
    r15 = _fv("asturias", 15, **kw)
    assert "AST-FV-001-A-P" in _ids(r15) and not any("Organismo de Control" in t.nombre for t in r15.tramites)
    r30 = _fv("asturias", 30, **kw)
    assert "AST-FV-001-A-Q" in _ids(r30) and any("Organismo de Control" in t.nombre for t in r30.tramites)


def test_baleares_acs_colectivo_sin_notificacion_sanitaria():
    res = _c(tipo_instalacion="acs", comunidad="baleares", potencia_kw=30, uso="residencial", tension="BT",
             municipio="X", uso_colectivo=True, acumulacion=True, recirculacion=True, dispone_acumulacion=True)
    assert not any("Notificación" in t.nombre and "autoridad sanitaria" in t.nombre for t in res.tramites)


def test_cantabria_gas_hasta_70kw_sin_comunicacion():
    res = _gas("cantabria", 35)
    assert _ids(res) == {"CANT-GBP-001"}
    assert not any("omunicaci" in t.nombre for t in res.tramites)


def test_cantabria_gas_con_proyecto_por_potencia_y_no_por_uso():
    assert "CANT-GBP-003" in _ids(_gas("cantabria", 80))
    assert "CANT-GBP-002" in _ids(_gas("cantabria", 80, uso="industrial"))
    assert _ids(_gas("cantabria", 40, uso="industrial")) == {"CANT-GBP-001"}
    com = [t for t in _gas("cantabria", 80).tramites if "omunicaci" in t.nombre]
    assert com and all(t.plazo_legal_dias is None for t in com)


def test_asturias_gas_comunicacion_sin_plazo_legal():
    res = _gas("asturias", 80)
    com = [t for t in res.tramites if "omunicaci" in t.nombre]
    assert com and all(t.plazo_legal_dias is None for t in com)
