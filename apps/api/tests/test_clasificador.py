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

def test_vertical_sin_cobertura_en_ccaa(clasificador):
    # Comunidad válida (está en el enum), pero sin JSON para ese vertical:
    # solo Andalucía tiene los 5 verticales completos.
    params = ClasificadorInput(
        tipo_instalacion="climatizacion_aerotermia",
        comunidad="madrid",
        potencia_kw=12,
        uso="residencial",
        municipio="Madrid",
    )
    with pytest.raises(NormativaNoEncontradaError):
        clasificador.clasificar(params)
