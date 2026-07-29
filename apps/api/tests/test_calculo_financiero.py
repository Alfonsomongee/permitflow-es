import pytest

from servicios.calculo_financiero import (
    calcular_escenario_fv,
    KWP_MIN_RESIDENCIAL,
    KWP_MAX_RESIDENCIAL,
)


def test_calculo_es_determinista():
    """Misma entrada -> misma salida exacta, sin componente aleatorio ni LLM."""
    r1 = calcular_escenario_fv(consumo_anual_kwh=4000, potencia_contratada_kw=5.75)
    r2 = calcular_escenario_fv(consumo_anual_kwh=4000, potencia_contratada_kw=5.75)
    assert r1.coste_inicial == r2.coste_inicial
    assert r1.ahorro_anual == r2.ahorro_anual
    assert r1.tiempo_retorno_anios == r2.tiempo_retorno_anios


def test_ahorro_nunca_supera_ahorro_maximo_fisico():
    """El ahorro anual nunca puede superar consumo_anual_kwh * precio_kwh:
    no se puede ahorrar más de lo que se consume."""
    consumo = 3000
    resultado = calcular_escenario_fv(consumo_anual_kwh=consumo)
    ahorro_maximo = consumo * 0.261  # PRECIO_KWH_EUR
    assert resultado.ahorro_anual <= ahorro_maximo + 0.01


def test_potencia_recomendada_dentro_de_rango_residencial():
    # Consumo muy alto no debe disparar la potencia recomendada por encima
    # del máximo residencial razonable.
    resultado = calcular_escenario_fv(consumo_anual_kwh=50000)
    assert KWP_MIN_RESIDENCIAL <= resultado.potencia_kwp <= KWP_MAX_RESIDENCIAL

    # Consumo muy bajo tampoco debe bajar de la potencia mínima.
    resultado_bajo = calcular_escenario_fv(consumo_anual_kwh=500)
    assert resultado_bajo.potencia_kwp >= KWP_MIN_RESIDENCIAL


def test_pvgis_real_cambia_produccion_especifica_frente_a_estimacion():
    generico = calcular_escenario_fv(
        consumo_anual_kwh=4000,
        produccion_especifica_fuente="estimado_espana",
    )
    con_pvgis = calcular_escenario_fv(
        consumo_anual_kwh=4000,
        produccion_especifica_kwh_kwp_year=1650.0,
        produccion_especifica_fuente="pvgis",
    )
    # Con más producción específica (más sol/mejor orientación), se necesita
    # menos potencia instalada para cubrir el mismo consumo.
    assert con_pvgis.potencia_kwp != generico.potencia_kwp
    assert con_pvgis.potencia_kwp < generico.potencia_kwp
    fuentes = {s.parametro: s.fuente_dato for s in con_pvgis.supuestos}
    assert fuentes["produccion_especifica_kwh_kwp_year"] == "leido"


def test_consumo_cero_o_negativo_lanza_error():
    with pytest.raises(ValueError):
        calcular_escenario_fv(consumo_anual_kwh=0)
    with pytest.raises(ValueError):
        calcular_escenario_fv(consumo_anual_kwh=-100)


def test_coste_inicial_siempre_positivo():
    resultado = calcular_escenario_fv(consumo_anual_kwh=2500)
    assert resultado.coste_inicial > 0
    assert resultado.ahorro_anual > 0
