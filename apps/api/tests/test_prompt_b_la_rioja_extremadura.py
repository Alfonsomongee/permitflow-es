"""Prompt B (2026-10-06): La Rioja y Extremadura, FV e IRVE (ADR 0008)."""
import pytest

from motor_normativo.clasificador import Clasificador
from schemas.clasificador import ClasificadorInput


def _c(**kw):
    return Clasificador().clasificar(ClasificadorInput(**kw))


def _ids(res):
    return {t.regla_id for t in res.tramites}


def _fv(com, p):
    return _c(tipo_instalacion="fotovoltaica_autoconsumo", comunidad=com, potencia_kw=p, uso="residencial",
              tension="BT", municipio="X", implantacion="cubierta")


@pytest.mark.parametrize("com,mem,proy", [("la_rioja", "RIO-FV-001", "RIO-FV-001P"),
                                          ("extremadura", "EXT-FV-001", "EXT-FV-001P")])
def test_fv_memoria_hasta_10kw_proyecto_despues(com, mem, proy):
    assert mem in _ids(_fv(com, 10)) and proy not in _ids(_fv(com, 10))
    assert proy in _ids(_fv(com, 10.01)) and mem not in _ids(_fv(com, 10.01))
    assert proy in _ids(_fv(com, 100))


def test_extremadura_registro_autoconsumo_es_cip_5625_no_5695():
    for p in (8, 50):
        reg = [t for t in _fv("extremadura", p).tramites if "CIP 5625" in t.nombre]
        assert reg and all(t.plataforma_url.endswith("/5625") for t in reg)


def test_extremadura_100_500kw_exige_autorizacion_de_explotacion():
    t = [x for x in _fv("extremadura", 200).tramites if "CIP 5873" in x.nombre]
    assert t and t[0].plazo_legal_dias == 90


def test_la_rioja_gas_hasta_70kw_sin_registro():
    res = _c(tipo_instalacion="gas_baja_presion", comunidad="la_rioja", potencia_kw=35, uso="residencial",
             tension="BT", municipio="X", presion_bar="normal")
    assert not any("nscripci" in t.nombre for t in res.tramites)
    res = _c(tipo_instalacion="gas_baja_presion", comunidad="la_rioja", potencia_kw=80, uso="residencial",
             tension="BT", municipio="X", presion_bar="normal")
    ins = [t for t in res.tramites if "nscripci" in t.nombre]
    assert ins and all(t.plazo_legal_dias is None for t in ins)


def test_extremadura_acs_colectivo_con_acumulacion_y_retorno_notifica_salud_publica():
    base = dict(tipo_instalacion="acs", comunidad="extremadura", potencia_kw=30, uso="residencial", tension="BT",
                municipio="X", uso_colectivo=True, recirculacion=True, dispone_acumulacion=True)
    res = _c(acumulacion=True, **base)
    assert "EXT-ACS-003" in _ids(res)
    assert "EXT-ACS-003" not in _ids(_c(acumulacion=False, **base))


def test_extremadura_gas_con_proyecto_va_por_cip_5625():
    res = _c(tipo_instalacion="gas_baja_presion", comunidad="extremadura", potencia_kw=80, uso="residencial",
             tension="BT", municipio="X", presion_bar="normal")
    reg = [t for t in res.tramites if "CIP 5625" in t.nombre]
    assert reg and all(t.plataforma_url.endswith("/5625") for t in reg)
    assert not any((t.plataforma_url or "").endswith("/5873") for t in res.tramites)
