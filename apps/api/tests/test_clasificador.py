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
    assert tramites[0].regla_id == "MAD-FV-BT-PUESTA-SERVICIO"
    assert tramites[0].tipo_actuacion == "accion_usuario"
    assert tramites[1].regla_id == "MAD-FV-REGISTRO-OFICIO"
    assert tramites[1].tipo_actuacion == "oficio_administracion"

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
