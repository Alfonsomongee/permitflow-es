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
    assert len(resultado.tramites) == 4
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

def test_climatizacion_andalucia_5_70kw(clasificador):
    params = ClasificadorInput(
        tipo_instalacion="climatizacion_aerotermia",
        comunidad="andalucia",
        potencia_kw=12,
        uso="residencial",
        municipio="Sevilla"
    )
    resultado = clasificador.clasificar(params)
    assert len(resultado.tramites) == 6
    assert "PUES" in resultado.tramites[-1].nombre

def test_gas_doméstico_andalucia(clasificador):
    params = ClasificadorInput(
        tipo_instalacion="gas_baja_presion",
        comunidad="andalucia",
        potencia_kw=24,
        uso="residencial",
        municipio="Sevilla",
        combustible="gas_natural"
    )
    resultado = clasificador.clasificar(params)
    assert len(resultado.tramites) == 5
    assert "PUES" not in [t.nombre for t in resultado.tramites]

def test_acs_andalucia_70kw(clasificador):
    params = ClasificadorInput(
        tipo_instalacion="acs",
        comunidad="andalucia",
        potencia_kw=30,
        uso="residencial",
        municipio="Sevilla"
    )
    resultado = clasificador.clasificar(params)
    assert len(resultado.tramites) >= 5
    assert "PUES" in resultado.tramites[-2].nombre or "PUES" in resultado.tramites[-1].nombre

def test_irve_andalucia(clasificador):
    params = ClasificadorInput(
        tipo_instalacion="irve",
        comunidad="andalucia",
        potencia_kw=22,
        uso="residencial",
        municipio="Sevilla",
        acceso_publico=False,
        modo_recarga="3",
        ubicacion_irve="garaje_comunitario",
        requiere_nuevo_suministro=False,
        solicita_ayuda=True
    )
    resultado = clasificador.clasificar(params)
    # Debería coger la regla AND-IRVE-001 y la AND-IRVE-004 (ayudas)
    # total: 6 trámites de la 001 + 2 trámites de la 004 = 8 trámites
    assert len(resultado.tramites) == 8
    nombres_tramites = [t.nombre for t in resultado.tramites]
    assert "Memoria Técnica de Diseño (MTD)" in nombres_tramites
    assert "Registro TECI" in nombres_tramites
    assert "Solicitud MOVES III vía empresa adherida" in nombres_tramites
