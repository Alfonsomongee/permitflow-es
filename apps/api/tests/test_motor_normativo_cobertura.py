"""Smoke test de cobertura: el Clasificador debe poder ejecutarse sin
reventar para CADA una de las 85 combinaciones (17 CCAA x 5 verticales) de
motor_normativo/reglas, no solo para las ~16 que tienen un caso de
referencia dedicado en tests/casos_referencia/.

Importante lo que este test NO afirma: no valida que el resultado sea
legalmente correcto (eso lo hacen los casos_referencia, validados a mano
contra la normativa real) ni que cada CCAA tenga trámites definidos para
este input concreto (una CCAA puede legítimamente no tener normativa
verificada para un caso y lanzar NormativaNoEncontradaError -- eso es
honesto, no un bug). Lo que sí afirma es más básico pero hasta ahora nadie
lo comprobaba para 8 de las 17 comunidades (cantabria, castilla_la_mancha,
castilla_leon, cataluna, extremadura, murcia, navarra, pais_vasco no tenían
NINGÚN test que invocara Clasificador.clasificar() contra sus JSON reales):
que ninguna combinación puede producir una excepción no controlada (un
KeyError, TypeError o ValidationError que llegaría a un usuario real como
500), y que ninguna regla de esa CCAA falla silenciosamente al evaluarse
(clasificar() atrapa errores de condición por regla y los deja solo en
`advertencias`/logs -- así que un bug de json-logic en, por ejemplo,
'murcia/acs.json' hoy no rompe el test suite en absoluto salvo que alguien
lo pruebe explícitamente con el input adecuado).
"""
from __future__ import annotations

import pytest

from motor_normativo.clasificador import Clasificador
from motor_normativo.excepciones import NormativaNoEncontradaError
from schemas.clasificador import ClasificadorInput, ComunidadAutonoma

COMUNIDADES: tuple[str, ...] = ComunidadAutonoma.__args__  # type: ignore[attr-defined]

# Un input "kitchen sink" por vertical: rellena TODOS los campos que alguna
# CCAA exige de forma condicional (ver ClasificadorInput.validate_inputs_by_ca)
# aunque la mayoría de comunidades los ignoren, para que el propio schema no
# rechace el caso antes de llegar al motor. Son valores plausibles de una
# instalación residencial estándar, no representan ninguna CCAA en concreto.
BASELINES: dict[str, dict] = {
    "fotovoltaica_autoconsumo": dict(
        potencia_kw=5.0,
        superficie_m2=30,
        uso="residencial",
        tension="BT",
        implantacion="cubierta",
        modalidad="nueva",
        modalidad_autoconsumo="con_excedentes_con_compensacion",
        ubicacion_suelo="urbanizado",
        requiere_acceso_conexion=False,
        solicita_ayuda=False,
    ),
    "irve": dict(
        potencia_kw=22.0,
        uso="residencial",
        tension="BT",
        numero_puntos=2,
        potencia_por_punto_kw=11.0,
        modo_recarga="3",
        acceso_publico=False,
        ubicacion_irve="garaje_comunitario",
        requiere_nuevo_suministro=False,
        uso_edificio="residencial",
        ventilacion_garaje="natural",
        numero_plazas_garaje=10,
        garaje_existente=True,
        numero_suministros_edificio=10,
    ),
    "climatizacion_aerotermia": dict(
        potencia_kw=12.0,
        uso="residencial",
        implantacion="exterior",
    ),
    "acs": dict(
        potencia_kw=24.0,
        uso="residencial",
        acumulacion=True,
        recirculacion=False,
        uso_colectivo=False,
        acs_centralizada=False,
        dispone_acumulacion=True,
        dispone_circuito_retorno=False,
        incluida_ambito_rd_487_2022=False,
        incluida_ambito_legionella=False,
    ),
    "gas_baja_presion": dict(
        potencia_kw=24.0,
        uso="residencial",
        combustible="gas_natural",
        presion_bar="normal",
        clase_instalacion_gas="individual",
        presion_operacion_bar=0.05,
        es_ampliacion=False,
        incremento_potencia_pct=0,
        potencia_resultante_kw=24.0,
        presion_resultante_bar=0.05,
        combustible_gas="gas_natural",
    ),
}

# Los tres usos, no solo residencial: el solapamiento de Cantabria/gas que
# destapó la auditoría QA 2026-08-11 solo aparecía en uso terciario, y ni este
# smoke ni test_fronteras.py (que parte de inputs residenciales) lo veían.
USOS = ("residencial", "terciario", "industrial")

CASOS = [
    (comunidad, tipo_instalacion, uso)
    for comunidad in COMUNIDADES
    for tipo_instalacion in BASELINES
    for uso in USOS
]


@pytest.mark.parametrize(
    "comunidad,tipo_instalacion,uso",
    CASOS,
    ids=[f"{c}-{t}-{u}" for c, t, u in CASOS],
)
def test_clasificar_no_revienta_para_ninguna_combinacion(comunidad, tipo_instalacion, uso):
    clasificador = Clasificador()
    params = ClasificadorInput(
        tipo_instalacion=tipo_instalacion,
        comunidad=comunidad,
        **{**BASELINES[tipo_instalacion], "uso": uso},
    )

    try:
        resultado = clasificador.clasificar(params)
    except NormativaNoEncontradaError:
        # Aceptable: la CCAA puede no tener normativa verificada para este
        # input concreto (ver huecos_verificacion en su JSON). Es un fallo
        # honesto, no un bug del clasificador.
        return

    # Si clasificó, el resultado tiene que ser internamente coherente y
    # ninguna regla debe haber fallado en silencio al evaluarse.
    ordenes = [t.orden for t in resultado.tramites]
    assert len(ordenes) == len(set(ordenes)), (
        f"{comunidad}/{tipo_instalacion}/{uso}: orden duplicado tras el "
        f"reordenado aditivo: {ordenes}"
    )

    # Trámites repetidos ENTRE reglas distintas. El linter ya detecta los
    # duplicados dentro de una misma regla (el bug de AND-FV-003), pero no
    # puede ver los que surgen cuando dos reglas que se solapan disparan a la
    # vez: eso solo se aprecia ejecutando el motor. Es lo que pasó en Cantabria
    # al corregir un valor de enum muerto — el plan pedía dos veces el
    # certificado de instalación de gas, y a la vez memoria técnica Y proyecto,
    # que son excluyentes.
    nombres = [t.nombre for t in resultado.tramites]
    repetidos = sorted({n for n in nombres if nombres.count(n) > 1})
    assert not repetidos, (
        f"{comunidad}/{tipo_instalacion}/{uso}: trámite(s) repetidos entre reglas "
        f"distintas: {repetidos}. Reglas que dispararon: "
        f"{sorted({t.regla_id for t in resultado.tramites if t.regla_id})}"
    )

    fallos_evaluacion = [
        a for a in resultado.advertencias if "no se pudieron evaluar" in a
    ]
    assert not fallos_evaluacion, (
        f"{comunidad}/{tipo_instalacion}/{uso}: {fallos_evaluacion[0]}"
    )
