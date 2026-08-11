"""El motor debe rechazar entradas fuera de dominio, no ramificar en silencio.

Origen: auditoría QA 2026-08-11, hallazgos M-02 y M-01. La batería de
"configuraciones imposibles" del informe encontró que se aceptaban sin una sola
queja: 0 kW, 0 puntos de recarga, inversión negativa, modo de recarga 9,
uso="marciano" y presión negativa. Esta última era la más seria: el signo
cambiado *relajaba* los requisitos, haciendo desaparecer el proyecto técnico.

El criterio: si un valor no puede existir, se rechaza en el schema. Si puede
existir pero es sospechoso (superficie que no cuadra con la potencia), se avisa
sin bloquear — eso vive en motor_normativo/coherencia.py.
"""

import pytest
from pydantic import ValidationError

from motor_normativo.clasificador import Clasificador
from schemas.clasificador import ClasificadorInput


def _fv(**kwargs):
    base = dict(
        comunidad="madrid",
        tipo_instalacion="fotovoltaica_autoconsumo",
        potencia_kw=10.0,
        uso="residencial",
        tension="BT",
        modalidad_autoconsumo="con_excedentes_con_compensacion",
    )
    base.update(kwargs)
    return base


class TestValoresFueraDeDominio:
    def test_potencia_cero_se_rechaza(self):
        """Antes devolvía un plan completo de trámites para una instalación de 0 kW."""
        with pytest.raises(ValidationError, match="greater_than|greater than"):
            ClasificadorInput(**_fv(potencia_kw=0))

    def test_potencia_negativa_se_rechaza(self):
        with pytest.raises(ValidationError):
            ClasificadorInput(**_fv(potencia_kw=-5))

    def test_inversion_negativa_se_rechaza(self):
        with pytest.raises(ValidationError):
            ClasificadorInput(**_fv(inversion_eur=-1000))

    def test_inversion_cero_es_valida(self):
        """0 € es raro pero posible (autoconstrucción, material donado)."""
        assert ClasificadorInput(**_fv(inversion_eur=0)).inversion_eur == 0

    @pytest.mark.parametrize("uso", ["marciano", "", "comercial", "Residencial"])
    def test_uso_fuera_del_enum_se_rechaza(self, uso):
        """`uso` era str libre y las reglas ramifican sobre él: una errata
        cambiaba el plan en silencio en vez de dar error."""
        with pytest.raises(ValidationError):
            ClasificadorInput(**_fv(uso=uso))

    @pytest.mark.parametrize("uso", ["residencial", "terciario", "industrial"])
    def test_los_tres_usos_reales_se_aceptan(self, uso):
        assert ClasificadorInput(**_fv(uso=uso)).uso == uso


class TestIRVE:
    def _irve(self, **kwargs):
        base = dict(
            comunidad="madrid",
            tipo_instalacion="irve",
            potencia_kw=14.8,
            uso="residencial",
            numero_puntos=2,
            potencia_por_punto_kw=7.4,
            modo_recarga="3",
        )
        base.update(kwargs)
        return base

    @pytest.mark.parametrize("puntos", [0, -3])
    def test_puntos_no_positivos_se_rechazan(self, puntos):
        with pytest.raises(ValidationError):
            ClasificadorInput(**self._irve(numero_puntos=puntos))

    @pytest.mark.parametrize("modo", ["9", "0", "5", "III"])
    def test_modo_de_recarga_inexistente_se_rechaza(self, modo):
        """Solo existen los modos 1 a 4 (IEC 61851)."""
        with pytest.raises(ValidationError):
            ClasificadorInput(**self._irve(modo_recarga=modo))

    @pytest.mark.parametrize("modo", ["1", "2", "3", "4"])
    def test_los_cuatro_modos_reales_se_aceptan(self, modo):
        assert ClasificadorInput(**self._irve(modo_recarga=modo)).modo_recarga == modo

    def test_potencia_por_punto_cero_se_rechaza(self):
        with pytest.raises(ValidationError):
            ClasificadorInput(**self._irve(potencia_por_punto_kw=0))


class TestGas:
    def _gas(self, **kwargs):
        base = dict(
            comunidad="madrid",
            tipo_instalacion="gas_baja_presion",
            potencia_kw=20.0,
            uso="residencial",
            combustible="gas_natural",
            presion_bar="normal",
            potencia_resultante_kw=20.0,
            presion_resultante_bar=0.05,
            es_ampliacion=False,
        )
        base.update(kwargs)
        return base

    def test_presion_negativa_se_rechaza(self):
        """El caso más grave de M-02: una presión negativa no solo era imposible,
        es que además hacía desaparecer el trámite de proyecto técnico."""
        with pytest.raises(ValidationError):
            ClasificadorInput(**self._gas(presion_operacion_bar=-1.0))

    def test_presion_resultante_negativa_se_rechaza(self):
        with pytest.raises(ValidationError):
            ClasificadorInput(**self._gas(presion_resultante_bar=-1.0))

    def test_incremento_de_potencia_negativo_se_rechaza(self):
        with pytest.raises(ValidationError):
            ClasificadorInput(**self._gas(es_ampliacion=True, incremento_potencia_pct=-20))


class TestSimetriaDelConflictoDeTension:
    """M-01: la comprobación existía en un solo sentido.

    Con tension="BT" y generación en AT se detectaba el conflicto, pero con
    tension="AT" y consumidor en BT se aceptaba en silencio y se devolvía el
    plan de alta tensión (autorización administrativa) para una instalación
    que podía no serlo.
    """

    def _regla_unica(self, **kwargs) -> str:
        plan = Clasificador().clasificar(ClasificadorInput(**_fv(**kwargs)))
        return plan.tramites[0].regla_id

    def test_bt_declarada_con_generacion_en_at(self):
        assert self._regla_unica(
            tension="BT", nivel_tension_generacion="at"
        ) == "REVISION-MANUAL-FV-TENSION-CONFLICTIVA"

    def test_at_declarada_con_consumidor_en_bt(self):
        """Este era el lado que faltaba."""
        assert self._regla_unica(
            tension="AT", nivel_tension_consumidor="bt"
        ) == "REVISION-MANUAL-FV-TENSION-CONFLICTIVA"

    def test_at_declarada_con_generacion_en_bt(self):
        assert self._regla_unica(
            tension="AT", nivel_tension_generacion="bt"
        ) == "REVISION-MANUAL-FV-TENSION-CONFLICTIVA"

    def test_conexion_incompatible_se_rechaza_antes_en_el_schema(self):
        with pytest.raises(ValidationError, match="incompatibles"):
            ClasificadorInput(**_fv(tension="BT", nivel_tension_conexion="at"))

    @pytest.mark.parametrize("tension", ["BT", "AT"])
    def test_sin_contradiccion_no_hay_revision_manual(self, tension):
        plan = Clasificador().clasificar(ClasificadorInput(**_fv(tension=tension)))
        assert all(t.tipo_actuacion != "revision_manual" for t in plan.tramites)

    def test_el_aviso_dice_que_tension_se_declaro(self):
        plan = Clasificador().clasificar(
            ClasificadorInput(**_fv(tension="AT", nivel_tension_consumidor="bt"))
        )
        assert "AT" in (plan.tramites[0].notas or "")
