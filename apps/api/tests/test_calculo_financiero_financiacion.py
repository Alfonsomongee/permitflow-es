"""Comparador de financiación (roadmap de mejoras, PREM-04): lo que suele
decidir una venta de autoconsumo no es el ahorro anual, es si la cuota
mensual es menor que la factura eléctrica actual. calcular_opciones_
financiacion() responde justo a eso -- ver la nota en OpcionFinanciacion
sobre qué parte es matemática exacta (amortización) y qué parte es una
horquilla de mercado sin verificar (TAE, % de renting).
"""
import pytest

from servicios.calculo_financiero import (
    calcular_escenario_fv,
    calcular_opciones_financiacion,
    PLAZO_PRESTAMO_ANIOS_DEFECTO,
    PLAZO_RENTING_ANIOS_DEFECTO,
    TAE_PRESTAMO_DEFECTO,
    RENTING_PCT_ANUAL,
)


def test_devuelve_prestamo_y_renting():
    opciones = calcular_opciones_financiacion(coste_inicial=10000, factura_actual_anual=1200)
    tipos = {o.tipo for o in opciones}
    assert tipos == {"prestamo", "renting"}


def test_cuota_prestamo_amortiza_el_principal_completo():
    # Suma de cuotas a lo largo del plazo == principal + intereses: si la
    # cuota estuviera mal calculada, o sobra o falta dinero al final del
    # préstamo -- la propiedad que de verdad importa de una amortización
    # francesa, no solo "que dé un número positivo".
    coste_inicial = 12000.0
    opciones = calcular_opciones_financiacion(coste_inicial, factura_actual_anual=1500)
    prestamo = next(o for o in opciones if o.tipo == "prestamo")
    # abs=1.0, no 0.01: coste_total_financiacion se calcula a partir de la
    # cuota SIN redondear, y este assert la recalcula desde cuota_mensual
    # YA redondeada a 2 decimales -- el error de redondeo se acumula en 120
    # pagos (como mucho 120 * 0.005 = 0.6 €), no es un fallo de la fórmula.
    assert prestamo.coste_total_financiacion == pytest.approx(
        prestamo.cuota_mensual * prestamo.plazo_anios * 12, abs=1.0
    )
    # Con TAE > 0, el coste total financiado es mayor que el principal
    # (paga intereses) -- si no lo fuera, la fórmula de amortización estaría
    # mal aplicada (p.ej. usando el principal directo sin interés).
    assert prestamo.coste_total_financiacion > coste_inicial


def test_cuota_sin_interes_es_principal_entre_meses():
    """Caso límite (TAE=0) con matemática trivial y verificable a mano, para
    detectar una división por cero mal manejada en la fórmula de
    amortización francesa (r_mensual == 0 en el denominador)."""
    from servicios.calculo_financiero import _cuota_mensual_amortizacion_francesa

    cuota = _cuota_mensual_amortizacion_francesa(principal=12000, tae_anual=0.0, plazo_anios=10)
    assert cuota == pytest.approx(12000 / 120, abs=0.001)


def test_ahorro_mensual_neto_es_factura_mensual_menos_cuota():
    factura_actual_anual = 1200.0
    opciones = calcular_opciones_financiacion(coste_inicial=8000, factura_actual_anual=factura_actual_anual)
    factura_mensual = factura_actual_anual / 12
    for o in opciones:
        assert o.ahorro_mensual_neto == pytest.approx(factura_mensual - o.cuota_mensual, abs=0.01)


def test_plazos_coinciden_con_las_constantes_por_defecto():
    opciones = calcular_opciones_financiacion(coste_inicial=9000, factura_actual_anual=1000)
    prestamo = next(o for o in opciones if o.tipo == "prestamo")
    renting = next(o for o in opciones if o.tipo == "renting")
    assert prestamo.plazo_anios == PLAZO_PRESTAMO_ANIOS_DEFECTO
    assert renting.plazo_anios == PLAZO_RENTING_ANIOS_DEFECTO


def test_nota_del_prestamo_cita_la_tae_usada():
    opciones = calcular_opciones_financiacion(coste_inicial=9000, factura_actual_anual=1000)
    prestamo = next(o for o in opciones if o.tipo == "prestamo")
    assert f"{TAE_PRESTAMO_DEFECTO:.1%}" in prestamo.nota


def test_renting_es_porcentaje_fijo_de_la_inversion():
    coste_inicial = 10000.0
    opciones = calcular_opciones_financiacion(coste_inicial, factura_actual_anual=1000)
    renting = next(o for o in opciones if o.tipo == "renting")
    esperado_mensual = coste_inicial * RENTING_PCT_ANUAL / 12
    assert renting.cuota_mensual == pytest.approx(esperado_mensual, abs=0.01)


def test_es_determinista():
    r1 = calcular_opciones_financiacion(10000, 1200)
    r2 = calcular_opciones_financiacion(10000, 1200)
    assert [o.cuota_mensual for o in r1] == [o.cuota_mensual for o in r2]


def test_calcular_escenario_fv_incluye_opciones_financiacion():
    # Integración: calcular_opciones_financiacion no es solo una función
    # suelta, tiene que llegar de verdad al escenario que consume el resto
    # del informe.
    resultado = calcular_escenario_fv(consumo_anual_kwh=4000)
    assert len(resultado.opciones_financiacion) == 2
    for o in resultado.opciones_financiacion:
        assert o.cuota_mensual > 0
