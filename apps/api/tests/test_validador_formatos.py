"""El validador debe entender los tres formatos de validación que hay en los JSON.

Origen: auditoría QA 2026-08-11, hallazgo A-05, cuyo diagnóstico resultó ser peor
de lo reportado. El informe decía que "el validador solo existe en 4 de 17
comunidades". Al implementarlo se descubrió que además **18 de las 26
validaciones definidas eran código muerto**: las de Madrid y Cataluña usan un
formato declarativo distinto (sin `condicion` json-logic) que el validador no
implementaba, así que `jsonLogic(False, ...)` devolvía siempre falso.

El efecto era el peor posible para un producto de cumplimiento: el panel mostraba
"Sin incidencias · 3 comprobaciones superadas" en las dos comunidades que la
aplicación presenta como mejor verificadas, cuando ninguna de esas tres
comprobaciones se había ejecutado. Un falso positivo tranquilizador, justo lo que
el propio panel intentaba evitar al distinguir "cero validaciones definidas" de
"cero incidencias".
"""

import pytest

from motor_normativo.validador import Validador
from schemas.clasificador import ClasificadorInput


def gas_madrid(**kwargs):
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
    return ClasificadorInput(**base)


class TestFormatoCamposObligatorios:
    """`{campos_requeridos, accion_si_faltan}` — sin condicion json-logic."""

    def test_avisa_cuando_falta_un_campo_del_que_dependen_las_reglas(self):
        # clase_instalacion_gas decide en Madrid entre proyecto técnico y
        # declaración responsable, pero el schema no lo exige: si falta, el plan
        # puede omitir un trámite y nadie se entera.
        resultado = Validador().validar(gas_madrid())
        ids = {h.id for h in resultado.hallazgos}
        assert "MAD-GAS-VALIDACION" in ids
        hallazgo = next(h for h in resultado.hallazgos if h.id == "MAD-GAS-VALIDACION")
        assert hallazgo.severidad == "error"
        assert "clase instalacion gas" in hallazgo.mensaje

    def test_no_avisa_cuando_estan_todos_los_campos(self):
        resultado = Validador().validar(gas_madrid(clase_instalacion_gas="individual"))
        assert resultado.total_errores == 0
        assert resultado.total_avisos == 0

    def test_el_mensaje_generado_no_esta_vacio(self):
        """Estas validaciones no traen `mensaje`: hay que construirlo."""
        resultado = Validador().validar(gas_madrid())
        for hallazgo in resultado.hallazgos:
            assert hallazgo.mensaje.strip(), f"{hallazgo.id} produce un mensaje vacío"


class TestFormatoDominioDeValor:
    """`{campo, valores_permitidos, obligatorio}`."""

    def test_avisa_si_falta_un_campo_obligatorio(self):
        resultado = Validador().validar(gas_madrid())
        hallazgo = next(
            (h for h in resultado.hallazgos if h.id == "MAD-GAS-VALIDACION-CLASE"), None
        )
        assert hallazgo is not None
        assert "individual" in hallazgo.mensaje  # enumera los valores admitidos

    def test_no_avisa_con_un_valor_del_dominio(self):
        resultado = Validador().validar(gas_madrid(clase_instalacion_gas="comun"))
        assert not [h for h in resultado.hallazgos if h.id == "MAD-GAS-VALIDACION-CLASE"]


class TestFormatoJsonLogic:
    """El formato original sigue funcionando igual."""

    def test_detecta_la_incoherencia_de_potencia_en_irve(self):
        resultado = Validador().validar(
            ClasificadorInput(
                comunidad="andalucia",
                tipo_instalacion="irve",
                potencia_kw=1000.0,
                uso="residencial",
                numero_puntos=2,
                potencia_por_punto_kw=7.4,
                modo_recarga="3",
                ubicacion_irve="exterior",
                acceso_publico=False,
            )
        )
        assert any(h.id == "AND-IRVE-VAL-001" and h.severidad == "error"
                   for h in resultado.hallazgos)

    def test_campos_requeridos_sigue_actuando_como_guarda(self):
        """Con `condicion`, un campo ausente desactiva la validación en vez de
        dispararla: json-logic evalúa los argumentos de forma eager y operar
        aritmética sobre None reventaría."""
        resultado = Validador().validar(
            ClasificadorInput(
                comunidad="andalucia",
                tipo_instalacion="irve",
                potencia_kw=1000.0,
                uso="residencial",
                modo_recarga="3",
                ubicacion_irve="exterior",
                acceso_publico=False,
                # sin numero_puntos ni potencia_por_punto_kw
            )
        )
        assert not [h for h in resultado.hallazgos if h.id == "AND-IRVE-VAL-001"]
        assert "AND-IRVE-VAL-001" not in resultado.no_evaluables


class TestNingunaValidacionQuedaMuerta:
    """Regresión de A-05: una validación definida debe poder producir hallazgo."""

    @pytest.mark.parametrize(
        "comunidad,vertical",
        [
            ("madrid", "gas_baja_presion"),
            ("madrid", "acs"),
            ("madrid", "fotovoltaica_autoconsumo"),
            ("madrid", "irve"),
            ("cataluna", "gas_baja_presion"),
            ("cataluna", "irve"),
        ],
    )
    def test_las_validaciones_se_ejecutan_sin_quedar_no_evaluables(self, comunidad, vertical):
        """Ninguna definición debe caer en `no_evaluables`: eso indica que su
        formato no se entiende, no que el expediente esté mal."""
        entradas = {
            "gas_baja_presion": dict(
                combustible="gas_natural", presion_bar="normal",
                potencia_resultante_kw=20.0, presion_resultante_bar=0.05, es_ampliacion=False,
            ),
            "acs": dict(acs_centralizada=False, incluida_ambito_legionella=False),
            "fotovoltaica_autoconsumo": dict(
                tension="BT", modalidad_autoconsumo="con_excedentes_con_compensacion",
                ubicacion_suelo="urbanizado", requiere_acceso_conexion=False,
            ),
            "irve": dict(
                numero_puntos=2, potencia_por_punto_kw=7.4, modo_recarga="3",
                acceso_publico=False, ubicacion_irve="garaje_comunitario",
                uso_edificio="residencial", ventilacion_garaje="natural",
                numero_plazas_garaje=30, garaje_existente=True,
            ),
        }[vertical]

        resultado = Validador().validar(
            ClasificadorInput(
                comunidad=comunidad, tipo_instalacion=vertical,
                potencia_kw=20.0, uso="residencial", **entradas,
            )
        )
        assert not resultado.no_evaluables, (
            f"{comunidad}/{vertical}: validaciones no evaluables (formato no soportado): "
            f"{resultado.no_evaluables}"
        )
