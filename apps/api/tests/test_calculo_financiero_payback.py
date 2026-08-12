"""Un payback de 0 años no existe: o hay retorno, o no lo hay.

Origen: auditoría integral 2026-08-11, hallazgo I-02. `tiempo_retorno_anios`
devolvía `0.0` cuando el ahorro anual era 0, y la interfaz lo mostraba como
"0 años" — es decir, presentaba la instalación menos rentable posible como la de
retorno instantáneo.

Es el mismo error conceptual que ya se corrigió en el motor normativo con el
"~0 días estimados" de los planes sin plazos: confundir *ausencia de dato* con
*valor cero*. Que apareciera dos veces en módulos distintos es la razón de que
esto tenga test propio.
"""

import pytest

from servicios.calculo_financiero import calcular_escenario_fv


def test_sin_ahorro_no_hay_payback_en_vez_de_cero():
    """Con precio 0 €/kWh el ahorro es 0: no hay retorno, no un retorno instantáneo."""
    escenario = calcular_escenario_fv(consumo_anual_kwh=3500, precio_kwh=0.0)

    assert escenario.ahorro_anual == 0
    assert escenario.tiempo_retorno_anios is None, (
        "Un payback de 0 se lee como retorno inmediato cuando significa lo contrario"
    )


def test_con_ahorro_el_payback_es_positivo_y_coherente():
    escenario = calcular_escenario_fv(consumo_anual_kwh=3500)

    assert escenario.tiempo_retorno_anios is not None
    assert escenario.tiempo_retorno_anios > 0
    # coste / ahorro, con el redondeo a un decimal que aplica el motor
    esperado = escenario.coste_inicial / escenario.ahorro_anual
    assert escenario.tiempo_retorno_anios == pytest.approx(esperado, abs=0.05)


def test_el_payback_nunca_es_exactamente_cero():
    """Barrido sobre precios plausibles: 0 no debe aparecer jamás como resultado."""
    for precio in (0.0, 0.05, 0.1, 0.261, 0.5, 1.0):
        escenario = calcular_escenario_fv(consumo_anual_kwh=3500, precio_kwh=precio)
        assert escenario.tiempo_retorno_anios != 0, (
            f"precio {precio} €/kWh produce un payback de 0 años"
        )


def test_el_payback_no_colapsa_a_cero_ni_en_precios_extremos():
    """El barrido anterior (hasta 1 EUR/kWh) no llegaba a activar nunca el caso
    real que sí rompía el motor: un payback positivo pero tan corto que
    `round(x, 1)` lo redondea a 0.0. La propia auditoría integral de 11/08
    afirmaba "el payback nunca es exactamente cero" con ese barrido -- una
    garantía que no era cierta fuera de ese rango.

    `precio_kwh` no es alcanzable hoy desde ningún endpoint (ningún router ni
    schema lo expone), así que esto no es explotable en producción ahora
    mismo. Pero si algún día se expone -- por ejemplo, para usar el precio
    real de una factura -- el bug no debe reaparecer sin que un test lo
    señale (auditoría fase 2, 2026-08-12, hallazgo P-06).
    """
    escenario = calcular_escenario_fv(consumo_anual_kwh=3500, precio_kwh=1000)
    assert escenario.tiempo_retorno_anios is not None
    assert escenario.tiempo_retorno_anios > 0
    assert escenario.tiempo_retorno_anios != 0.0

    # También en el borde exacto que colapsaba antes: coste_inicial / ahorro
    # cae por debajo de 0.05 (el umbral de redondeo a 1 decimal).
    for precio in (200, 500, 1000, 10_000):
        e = calcular_escenario_fv(consumo_anual_kwh=3500, precio_kwh=precio)
        assert e.tiempo_retorno_anios is not None and e.tiempo_retorno_anios > 0, (
            f"precio {precio} €/kWh produce un payback nulo o negativo"
        )


@pytest.mark.parametrize("consumo", [500, 3500, 12000, 30000])
def test_coherencia_interna_del_escenario(consumo):
    """Invariantes que deben cumplirse siempre, sea cual sea el consumo."""
    e = calcular_escenario_fv(consumo_anual_kwh=consumo)

    # Nunca se autoconsume más de lo que se consume.
    assert e.ahorro_anual <= e.factura_actual_anual + 0.01

    # La factura con instalación nunca es negativa ni mayor que la actual.
    assert 0 <= e.factura_con_instalacion_anual <= e.factura_actual_anual + 0.01

    # La resta cuadra con el ahorro declarado.
    assert e.factura_actual_anual - e.factura_con_instalacion_anual == pytest.approx(
        e.ahorro_anual, abs=0.02
    )

    # La potencia se mantiene dentro del rango residencial declarado.
    assert 1.5 <= e.potencia_kwp <= 10.0
