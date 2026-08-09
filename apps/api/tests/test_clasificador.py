import pytest
from pydantic import ValidationError
from motor_normativo.clasificador import Clasificador
from motor_normativo.excepciones import NormativaNoEncontradaError
from schemas.clasificador import ClasificadorInput

@pytest.fixture
def clasificador():
    return Clasificador()

def test_comunidad_invalida_rechazada_por_schema():
    # Tras Literal[...] en ClasificadorInput, un slug no soportado ya ni
    # siquiera llega al motor: falla en la validación de entrada.
    with pytest.raises(ValidationError):
        ClasificadorInput(
            tipo_instalacion="fotovoltaica_autoconsumo",
            comunidad="ceuta",
            potencia_kw=5,
            uso="residencial",
            municipio="Ceuta",
        )

from unittest.mock import patch

def test_vertical_sin_cobertura_en_ccaa(clasificador):
    # Simulamos que el archivo JSON no existe para probar la excepción
    params = ClasificadorInput(
        tipo_instalacion="climatizacion_aerotermia",
        comunidad="madrid",
        potencia_kw=12,
        uso="residencial",
        municipio="Madrid",
    )
    with patch("pathlib.Path.exists", return_value=False):
        with pytest.raises(NormativaNoEncontradaError):
            clasificador.clasificar(params)

def test_fv_madrid_bt_normalizacion(clasificador):
    params = ClasificadorInput(
        tipo_instalacion="fotovoltaica_autoconsumo",
        comunidad="madrid",
        potencia_kw=10,
        uso="residencial",
        tension="BT",
    )
    res = clasificador.clasificar(params)
    tramites = res.tramites
    assert len(tramites) == 2
    
    por_id = {tramite.regla_id: tramite for tramite in res.tramites}
    assert set(por_id.keys()) == {
        "MAD-FV-BT-PUESTA-SERVICIO",
        "MAD-FV-REGISTRO-OFICIO",
    }
    assert por_id["MAD-FV-BT-PUESTA-SERVICIO"].tipo_actuacion == "accion_usuario"
    assert por_id["MAD-FV-REGISTRO-OFICIO"].tipo_actuacion == "oficio_administracion"

def test_fv_madrid_bt_conflicto(clasificador):
    with pytest.raises(ValidationError):
        ClasificadorInput(
            tipo_instalacion="fotovoltaica_autoconsumo",
            comunidad="madrid",
            potencia_kw=10,
            uso="residencial",
            tension="BT",
            nivel_tension_conexion="at"
        )

def test_fv_madrid_sin_tension(clasificador):
    params = ClasificadorInput(
        tipo_instalacion="fotovoltaica_autoconsumo",
        comunidad="madrid",
        potencia_kw=10,
        uso="residencial",
    )
    res = clasificador.clasificar(params)
    assert len(res.tramites) == 1
    assert res.tramites[0].tipo_actuacion == "revision_manual"
    assert res.tramites[0].regla_id == "REVISION-MANUAL-FV-TENSION-AUSENTE"


# ─── Regla transversal solicita_ayuda (arquitectura ahora, investigar después) ──
#
# Auditoría 2026-08-09 detectó que solo Andalucía tenía contenido específico de
# ayudas/subvenciones (AND-FV-003) y que, además, esa regla duplicaba el trámite
# "Solicitud del CAU" ya presente incondicionalmente en AND-FV-001. Se corrigió
# el duplicado y se añadió un trámite genérico transversal (GEN-AYUDA-INFORMATIVA)
# para las CCAA que aún no tienen una regla propia de ayudas condicionada a
# solicita_ayuda -- ver _condicion_referencia_var() y clasificar() en
# motor_normativo/clasificador.py.

def test_andalucia_ayuda_no_duplica_cau_y_no_anade_generico(clasificador):
    # Andalucía ya tiene contenido específico de ayudas (AND-FV-003): no debe
    # aparecer el trámite genérico, y "Solicitud del CAU" debe aparecer una
    # sola vez (antes del fix aparecía dos veces: en AND-FV-001 y AND-FV-003).
    params = ClasificadorInput(
        tipo_instalacion="fotovoltaica_autoconsumo",
        comunidad="andalucia",
        potencia_kw=5,
        uso="residencial",
        tension="BT",
        solicita_ayuda=True,
    )
    res = clasificador.clasificar(params)
    nombres = [t.nombre for t in res.tramites]
    assert nombres.count("Solicitud del CAU (Código de Autoconsumo) a la distribuidora") == 1
    assert "GEN-AYUDA-INFORMATIVA" not in [t.regla_id for t in res.tramites]
    assert any(t.regla_id == "AND-FV-003" for t in res.tramites)

def test_galicia_ayuda_anade_tramite_con_catalogo_real(clasificador):
    # Galicia no tiene (todavía) una regla propia de ayudas en el JSON del motor,
    # pero SÍ hay una entrada investigada en servicios/catalogo_ayudas.py (GAL-FV,
    # INEGA): el trámite transversal debe reutilizar ese contenido real, no un
    # aviso genérico vacío.
    params = ClasificadorInput(
        tipo_instalacion="fotovoltaica_autoconsumo",
        comunidad="galicia",
        potencia_kw=5,
        uso="residencial",
        tension="BT",
        solicita_ayuda=True,
    )
    res = clasificador.clasificar(params)
    genericos = [t for t in res.tramites if t.regla_id == "GEN-AYUDA-INFORMATIVA"]
    assert len(genericos) == 1
    assert genericos[0].tipo_actuacion == "informativa"
    assert "INEGA" in genericos[0].notas
    assert "GAL-FV" in genericos[0].notas or "IN421" in genericos[0].notas

def test_galicia_sin_solicitar_ayuda_no_anade_generico(clasificador):
    params = ClasificadorInput(
        tipo_instalacion="fotovoltaica_autoconsumo",
        comunidad="galicia",
        potencia_kw=5,
        uso="residencial",
        tension="BT",
        solicita_ayuda=False,
    )
    res = clasificador.clasificar(params)
    assert "GEN-AYUDA-INFORMATIVA" not in [t.regla_id for t in res.tramites]

def test_ayuda_generica_sin_catalogo_usa_aviso_honesto(clasificador):
    # La Rioja + gas_baja_presion no tiene ninguna regla propia de ayudas ni
    # entrada en el catálogo (ver test_ayudas.py::test_simular_ayudas_sin_resultados_da_aviso_explicito):
    # el trámite transversal debe usar el aviso honesto de "no localizado",
    # nunca inventar un organismo o convocatoria.
    params = ClasificadorInput(
        tipo_instalacion="gas_baja_presion",
        comunidad="la_rioja",
        potencia_kw=30,
        uso="residencial",
        presion_bar="normal",
        solicita_ayuda=True,
    )
    res = clasificador.clasificar(params)
    genericos = [t for t in res.tramites if t.regla_id == "GEN-AYUDA-INFORMATIVA"]
    assert len(genericos) == 1
    assert "No se ha localizado" in genericos[0].notas
    assert genericos[0].organismo == "Administración autonómica / agencia de energía de tu comunidad"
