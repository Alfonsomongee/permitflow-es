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

CASOS = [
    (comunidad, tipo_instalacion)
    for comunidad in COMUNIDADES
    for tipo_instalacion in BASELINES
]


@pytest.mark.parametrize(
    "comunidad,tipo_instalacion",
    CASOS,
    ids=[f"{c}-{t}" for c, t in CASOS],
)
def test_clasificar_no_revienta_para_ninguna_combinacion(comunidad, tipo_instalacion):
    clasificador = Clasificador()
    params = ClasificadorInput(
        tipo_instalacion=tipo_instalacion,
        comunidad=comunidad,
        **BASELINES[tipo_instalacion],
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
        f"{comunidad}/{tipo_instalacion}: orden duplicado tras el reordenado "
        f"aditivo: {ordenes}"
    )

    fallos_evaluacion = [
        a for a in resultado.advertencias if "no se pudieron evaluar" in a
    ]
    assert not fallos_evaluacion, (
        f"{comunidad}/{tipo_instalacion}: {fallos_evaluacion[0]}"
    )
