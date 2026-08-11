"""Tests de las comprobaciones de coherencia física entre parámetros.

Origen: auditoría QA 2026-08-11, hallazgos C-03 y M-02. El formulario pedía la
superficie diciendo que servía para contrastarla con la potencia, pero esa
comprobación no existía: 1 m² con 100 kW pasaba sin una sola advertencia.
"""

import pytest

from motor_normativo.clasificador import Clasificador
from motor_normativo.coherencia import comprobar_coherencia
from schemas.clasificador import ClasificadorInput


def _fv(**kwargs):
    base = {"tipo_instalacion": "fotovoltaica_autoconsumo", "potencia_kw": 10.0}
    base.update(kwargs)
    return base


def _irve(**kwargs):
    base = {"tipo_instalacion": "irve", "potencia_kw": 14.8}
    base.update(kwargs)
    return base


class TestSuperficieFotovoltaica:
    def test_superficie_imposiblemente_pequena_avisa(self):
        # 1 m² para 100 kW: no cabe ni con los módulos más eficientes.
        avisos = comprobar_coherencia(_fv(potencia_kw=100.0, superficie_m2=1.0))
        assert len(avisos) == 1
        assert "demasiado pequeña" in avisos[0]

    def test_superficie_plausible_no_avisa(self):
        # 50 m² para 10 kW = 5 m²/kW, lo habitual en cubierta.
        assert comprobar_coherencia(_fv(potencia_kw=10.0, superficie_m2=50.0)) == []

    def test_limite_inferior_es_inclusivo_hacia_lo_valido(self):
        # Justo en el umbral (2,5 m²/kW) no debe avisar; por debajo sí.
        assert comprobar_coherencia(_fv(potencia_kw=10.0, superficie_m2=25.0)) == []
        assert comprobar_coherencia(_fv(potencia_kw=10.0, superficie_m2=24.9)) != []

    def test_superficie_desproporcionada_avisa(self):
        # 500 m² para 10 kW: casi siempre es la cubierta entera, no el generador.
        avisos = comprobar_coherencia(_fv(potencia_kw=10.0, superficie_m2=500.0))
        assert len(avisos) == 1
        assert "muy grande" in avisos[0]

    def test_sin_superficie_no_aplica(self):
        assert comprobar_coherencia(_fv(superficie_m2=None)) == []

    def test_potencia_cero_no_divide_entre_cero(self):
        assert comprobar_coherencia(_fv(potencia_kw=0.0, superficie_m2=50.0)) == []

    def test_no_aplica_a_otras_tecnologias(self):
        # En térmicas la superficie no guarda relación fija con la potencia.
        datos = {"tipo_instalacion": "acs", "potencia_kw": 100.0, "superficie_m2": 1.0}
        assert comprobar_coherencia(datos) == []


class TestPotenciaIRVE:
    def test_potencia_incoherente_con_los_puntos_avisa(self):
        avisos = comprobar_coherencia(
            _irve(potencia_kw=1000.0, numero_puntos=2, potencia_por_punto_kw=7.4)
        )
        assert len(avisos) == 1
        assert "no cuadra" in avisos[0]

    def test_potencia_coherente_no_avisa(self):
        assert (
            comprobar_coherencia(
                _irve(potencia_kw=14.8, numero_puntos=2, potencia_por_punto_kw=7.4)
            )
            == []
        )

    def test_tolera_redondeos_razonables(self):
        # 15 kW declarados frente a 14,8 reales: diferencia del 1,3 %.
        assert (
            comprobar_coherencia(
                _irve(potencia_kw=15.0, numero_puntos=2, potencia_por_punto_kw=7.4)
            )
            == []
        )

    def test_faltan_datos_no_aplica(self):
        assert comprobar_coherencia(_irve(numero_puntos=None)) == []


class TestBooleanosNoSeConfundenConNumeros:
    """`True` es instancia de `int` en Python; no debe colarse como potencia."""

    def test_bool_no_cuenta_como_numero(self):
        assert comprobar_coherencia(_fv(potencia_kw=True, superficie_m2=50.0)) == []


class TestIntegracionConElClasificador:
    def test_el_aviso_llega_a_las_advertencias_del_plan(self):
        """Regresión de C-03: el dato se pedía y no se usaba para nada."""
        plan = Clasificador().clasificar(
            ClasificadorInput(
                comunidad="madrid",
                tipo_instalacion="fotovoltaica_autoconsumo",
                potencia_kw=100.0,
                superficie_m2=1.0,
                uso="residencial",
                tension="BT",
                modalidad_autoconsumo="con_excedentes_con_compensacion",
            )
        )
        assert any("demasiado pequeña" in a for a in plan.advertencias)

    def test_un_plan_coherente_no_arrastra_avisos_extra(self):
        plan = Clasificador().clasificar(
            ClasificadorInput(
                comunidad="madrid",
                tipo_instalacion="fotovoltaica_autoconsumo",
                potencia_kw=10.0,
                superficie_m2=50.0,
                uso="residencial",
                tension="BT",
                modalidad_autoconsumo="con_excedentes_con_compensacion",
            )
        )
        assert not any("superficie" in a.lower() for a in plan.advertencias)


@pytest.mark.parametrize("superficie", [0.0, -5.0])
def test_superficies_no_positivas_no_generan_ruido(superficie):
    """0 se interpreta como 'no informado', no como una superficie de 0 m²."""
    avisos = comprobar_coherencia(_fv(potencia_kw=10.0, superficie_m2=superficie))
    assert avisos == []
