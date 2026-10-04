"""Prompt B (2026-10-04): Andalucía, Comunitat Valenciana y Canarias (ADR 0004)."""
import pytest

from motor_normativo.clasificador import Clasificador
from schemas.clasificador import ClasificadorInput


def _c(**kw):
    return Clasificador().clasificar(ClasificadorInput(**kw))


def _ids(res):
    return {t.regla_id for t in res.tramites}


# ── Canarias FV: proyecto por encima de 10 kW ─────────────────────────────────
def _fv_can(p, **kw):
    return _c(tipo_instalacion="fotovoltaica_autoconsumo", comunidad="canarias",
              potencia_kw=p, uso="residencial", tension="BT", municipio="Las Palmas",
              implantacion="cubierta", **kw)


@pytest.mark.parametrize("p,esperada", [(10, "ICAN-FV-001"), (10.01, "ICAN-FV-001P"), (100, "ICAN-FV-001P")])
def test_canarias_fv_memoria_hasta_10kw_proyecto_despues(p, esperada):
    ids = _ids(_fv_can(p))
    assert esperada in ids
    assert ids <= {"ICAN-FV-001", "ICAN-FV-001P"}


def test_canarias_fv_mas_de_100kw_autorizacion():
    assert "ICAN-FV-002" in _ids(_fv_can(150))


def test_canarias_fv_proyecto_modificacion_existente():
    ids = _ids(_fv_can(50, instalacion_origen_modificada=True))
    assert "ICAN-FV-001BP" in ids and "ICAN-FV-001P" not in ids


# ── Comunitat Valenciana: gas sin proyecto no comunica ────────────────────────
def _gas_cv(p, bar="normal"):
    return _c(tipo_instalacion="gas_baja_presion", comunidad="comunidad_valenciana",
              potencia_kw=p, uso="residencial", tension="BT", municipio="Valencia", presion_bar=bar)


def test_cv_gas_hasta_70kw_sin_comunicacion():
    res = _gas_cv(25)
    assert _ids(res) == {"CV-GAS-002"}
    assert not any("Registro/comunicación" in t.nombre for t in res.tramites)


def test_cv_gas_mas_de_70kw_comunica_sin_plazo_legal():
    res = _gas_cv(80)
    com = [t for t in res.tramites if "Registro/comunicación" in t.nombre]
    assert com and com[0].plazo_legal_dias is None


# ── Andalucía: la documentación depende de la potencia, no del uso ────────────
@pytest.mark.parametrize("uso", ["residencial", "terciario"])
def test_andalucia_acs_5_a_70kw_es_memoria_cualquier_uso(uso):
    res = _c(tipo_instalacion="acs", comunidad="andalucia", potencia_kw=30, uso=uso,
             tension="BT", municipio="Sevilla", tipo_generador_acs="bomba_calor", uso_colectivo=False)
    ids = _ids(res)
    assert any(i.startswith("AND-ACS-001") for i in ids)
    assert not any(i.startswith("AND-ACS-002") for i in ids)


def test_andalucia_acs_mas_de_70kw_es_proyecto():
    res = _c(tipo_instalacion="acs", comunidad="andalucia", potencia_kw=100, uso="residencial",
             tension="BT", municipio="Sevilla", tipo_generador_acs="bomba_calor", uso_colectivo=False)
    assert any(i.startswith("AND-ACS-002") for i in _ids(res))


def test_andalucia_acs_uso_colectivo_sin_notificacion_sanitaria():
    res = _c(tipo_instalacion="acs", comunidad="andalucia", potencia_kw=100, uso="terciario",
             tension="BT", municipio="Sevilla", tipo_generador_acs="bomba_calor", uso_colectivo=True,
             acumulacion=True, recirculacion=True, dispone_acumulacion=True)
    nombres = [t.nombre for t in res.tramites if t.regla_id == "AND-ACS-003"]
    assert nombres and not any("Notificación sanitaria" in n for n in nombres)


@pytest.mark.parametrize("p,uso,prefijo", [(8, "residencial", "AND-FV-001"), (8, "terciario", "AND-FV-001"),
                                           (12, "residencial", "AND-FV-001B"), (12, "terciario", "AND-FV-002")])
def test_andalucia_fv_mtd_hasta_10kw_cualquier_uso(p, uso, prefijo):
    res = _c(tipo_instalacion="fotovoltaica_autoconsumo", comunidad="andalucia", potencia_kw=p,
             uso=uso, tension="BT", municipio="Sevilla")
    assert any(i.startswith(prefijo) for i in _ids(res))
    if p <= 10:
        assert not any(i.startswith(("AND-FV-001B", "AND-FV-002")) for i in _ids(res))


def test_andalucia_pues_sin_plazo_legal_ni_silencio():
    res = _c(tipo_instalacion="fotovoltaica_autoconsumo", comunidad="andalucia", potencia_kw=8,
             uso="residencial", tension="BT", municipio="Sevilla")
    pues = [t for t in res.tramites if "PUES" in t.nombre]
    assert pues and all(t.plazo_legal_dias is None for t in pues)
    assert not any("ilencio administrativo positivo" in (t.notas or "") for t in pues)


def test_andalucia_gas_por_potencia_cualquier_uso():
    res = _c(tipo_instalacion="gas_baja_presion", comunidad="andalucia", potencia_kw=40,
             uso="terciario", tension="BT", municipio="Sevilla", presion_bar="normal")
    assert _ids(res) == {"AND-GAS-001"}
