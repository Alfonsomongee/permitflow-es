import pytest
from motor_normativo.clasificador import Clasificador
from motor_normativo.excepciones import NormativaNoEncontradaError
from schemas.clasificador import ClasificadorInput

@pytest.fixture
def clasificador():
    return Clasificador()

def test_residencial_menor_10kw(clasificador):
    params = ClasificadorInput(
        tipo_instalacion="fotovoltaica_autoconsumo",
        comunidad="andalucia",
        potencia_kw=8,
        uso="residencial",
        municipio="Sevilla"
    )
    resultado = clasificador.clasificar(params)
    assert len(resultado.tramites) == 3
    assert "Comunicación previa" in resultado.tramites[0].nombre

def test_residencial_mayor_10kw(clasificador):
    params = ClasificadorInput(
        tipo_instalacion="fotovoltaica_autoconsumo",
        comunidad="andalucia",
        potencia_kw=15,
        uso="residencial",
        municipio="Sevilla"
    )
    resultado = clasificador.clasificar(params)
    assert len(resultado.tramites) == 5
    assert "Solicitud de punto de acceso" in resultado.tramites[0].nombre

def test_comunidad_sin_normativa(clasificador):
    params = ClasificadorInput(
        tipo_instalacion="fotovoltaica_autoconsumo",
        comunidad="ceuta",
        potencia_kw=5,
        uso="residencial",
        municipio="Ceuta"
    )
    with pytest.raises(NormativaNoEncontradaError):
        clasificador.clasificar(params)
