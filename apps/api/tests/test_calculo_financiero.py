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


def test_matching_mensual_reduce_autoconsumo_si_consumo_esta_desfasado():
    """Un hogar que consume sobre todo en invierno (cuando el sol produce
    menos) debe autoconsumir menos de lo que estimaría el ratio plano anual
    -- el matching mensual tiene que capturar eso, no promediarlo."""
    consumo_anual = 4000.0
    # Consumo concentrado en los 3 meses de menor producción solar
    # (índices 0-based: 11=dic, 0=ene, 1=feb)
    consumo_mensual = [
        1300.0 if m in (11, 0, 1) else (4000.0 - 3900.0) / 9 for m in range(12)
    ]
    # Producción específica plana ficticia (misma cada mes) a 1 kWp
    produccion_mensual_1kwp = [100.0] * 12

    con_matching = calcular_escenario_fv(
        consumo_anual_kwh=consumo_anual,
        consumo_mensual_kwh=consumo_mensual,
        produccion_mensual_kwh_1kwp=produccion_mensual_1kwp,
    )
    sin_matching = calcular_escenario_fv(consumo_anual_kwh=consumo_anual)

    assert con_matching.ahorro_anual < sin_matching.ahorro_anual
    parametros = {s.parametro for s in con_matching.supuestos}
    assert "perfil_mensual_consumo" in parametros


def test_matching_mensual_ignorado_si_faltan_datos():
    """Si solo se pasa uno de los dos arrays de 12 meses, se debe caer al
    comportamiento por defecto sin fallar."""
    resultado = calcular_escenario_fv(
        consumo_anual_kwh=3000,
        consumo_mensual_kwh=[250.0] * 12,
        produccion_mensual_kwh_1kwp=None,
    )
    parametros = {s.parametro for s in resultado.supuestos}
    assert "perfil_mensual_consumo" not in parametros


def test_matching_mensual_nunca_supera_consumo_anual():
    consumo_anual = 3000.0
    consumo_mensual = [consumo_anual / 12] * 12
    produccion_mensual_1kwp = [500.0] * 12  # producción muy alta a propósito

    resultado = calcular_escenario_fv(
        consumo_anual_kwh=consumo_anual,
        consumo_mensual_kwh=consumo_mensual,
        produccion_mensual_kwh_1kwp=produccion_mensual_1kwp,
    )
    ahorro_maximo = consumo_anual * 0.261
    assert resultado.ahorro_anual <= ahorro_maximo + 0.01
