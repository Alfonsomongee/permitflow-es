"""Prompt B (2026-10-05): Murcia, Navarra y Castilla-La Mancha (ADR 0006)."""
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


def _gas(com, p):
    return _c(tipo_instalacion="gas_baja_presion", comunidad=com, potencia_kw=p, uso="residencial",
              tension="BT", municipio="X", presion_bar="normal")


@pytest.mark.parametrize("com,mem,proy", [("murcia", "MUR-FV-001", "MUR-FV-001P"),
                                          ("navarra", "NAV-FV-001", "NAV-FV-001P"),
                                          ("castilla_la_mancha", "CLM-FV-001", "CLM-FV-001P")])
def test_fv_memoria_hasta_10kw_proyecto_despues(com, mem, proy):
    assert _ids(_fv(com, 10)) == {mem}
    assert _ids(_fv(com, 10.01)) == {proy}
    assert _ids(_fv(com, 100)) == {proy}


@pytest.mark.parametrize("com", ["murcia", "navarra", "castilla_la_mancha"])
def test_gas_hasta_70kw_sin_registro_ni_comunicacion(com):
    nombres = [t.nombre.lower() for t in _gas(com, 35).tramites]
    assert not any("registro" in n or "inscripci" in n or "comunicaci" in n for n in nombres)
    assert any("registro" in t.nombre.lower() or "comunicaci" in t.nombre.lower()
               for t in _gas(com, 80).tramites)


def test_murcia_gas_organismo_registro_no_es_oca():
    res = _gas("murcia", 80)
    registro = [t for t in res.tramites if "registro" in t.nombre.lower()]
    assert registro and all("OCA" not in (t.organismo or "") for t in registro)


def test_navarra_gas_registro_sin_orden_foral_derogada():
    registro = [t for t in _gas("navarra", 80).tramites if "Registro" in t.nombre]
    assert registro and all("64/2022" not in (t.base_legal or "") for t in registro)


@pytest.mark.parametrize("com", ["murcia", "navarra", "castilla_la_mancha"])
def test_comunicaciones_sin_plazo_legal_de_resolucion(com):
    for t in _gas(com, 80).tramites:
        if "omunicaci" in t.nombre:
            assert t.plazo_legal_dias is None
