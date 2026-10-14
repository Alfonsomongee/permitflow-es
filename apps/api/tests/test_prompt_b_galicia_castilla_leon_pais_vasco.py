"""Prompt B (2026-10-05): Galicia, Castilla y León y País Vasco (ADR 0005)."""
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


@pytest.mark.parametrize("com,mem,proy", [("galicia", "GAL-FV-001", "GAL-FV-001P"),
                                          ("castilla_leon", "CYL-FV-001", "CYL-FV-001P")])
def test_fv_memoria_hasta_10kw_proyecto_despues(com, mem, proy):
    assert _ids(_fv(com, 10)) == {mem}
    assert _ids(_fv(com, 10.01)) == {proy}
    assert _ids(_fv(com, 100)) == {proy}
    assert mem not in _ids(_fv(com, 50))


def test_galicia_fv_incluye_registro_in614c():
    nombres = [t.nombre for t in _fv("galicia", 8).tramites]
    assert any("IN614C" in n for n in nombres) and any("IN407B" in n for n in nombres)


def test_castilla_leon_fv_usa_rise_no_boel():
    pasos = [t for t in _fv("castilla_leon", 8).tramites if "Inscripción" in t.nombre]
    assert pasos and all("RISE" in (t.plataforma or "") for t in pasos)
    assert not any("BOEL" in t.nombre for t in pasos)


def _gas(com, p, **kw):
    return _c(tipo_instalacion="gas_baja_presion", comunidad=com, potencia_kw=p, uso="residencial",
              tension="BT", municipio="X", presion_bar="normal", **kw)


def test_galicia_gas_hasta_70kw_sin_registro():
    res = _gas("galicia", 35)
    assert [t.nombre for t in res.tramites] == ["Memoria técnica de instalación de gas"]
    assert any("IN625A" in t.nombre for t in _gas("galicia", 80).tramites)


def test_castilla_leon_gas_hasta_70kw_sin_inscripcion():
    assert not any("Inscripción" in t.nombre for t in _gas("castilla_leon", 40).tramites)
    assert any("Inscripción" in t.nombre for t in _gas("castilla_leon", 80).tramites)


def test_pais_vasco_gas_hasta_70kw_sin_declaracion_en_sede():
    res = _gas("pais_vasco", 28)
    assert not any("puesta en servicio" in t.nombre.lower() and "Certificado" in t.nombre for t in res.tramites)
    assert all(t.paralelo_con is None for t in res.tramites)
    con = _gas("pais_vasco", 80)
    cert = [t for t in con.tramites if t.nombre.startswith("Certificado de instalación")]
    assert cert and cert[0].plazo_legal_dias is None


def test_pais_vasco_irve_bt_a_no_ge():
    res = _c(tipo_instalacion="irve", comunidad="pais_vasco", potencia_kw=7, uso="residencial", tension="BT",
             municipio="X", modo_recarga="3", ubicacion_irve="interior")
    urls = [t.plataforma_url for t in res.tramites if t.plataforma_url]
    assert urls and all("/procedimiento/bt/" in u for u in urls)
    assert not any("autorización administrativa previa" in t.nombre.lower() for t in res.tramites)


def test_castilla_leon_acs_colectivo_sin_notificacion_sanitaria():
    res = _c(tipo_instalacion="acs", comunidad="castilla_leon", potencia_kw=100, uso="terciario", tension="BT",
             municipio="X", tipo_generador_acs="bomba_calor", uso_colectivo=True)
    nombres = [t.nombre for t in res.tramites if t.regla_id == "CYL-ACS-003"]
    assert nombres and not any("Notificación" in n for n in nombres)
