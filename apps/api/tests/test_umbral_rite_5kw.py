"""El umbral RITE de 5 kW debe comportarse igual en las 17 comunidades.

Origen: auditoría QA 2026-08-11, hallazgo C-02. La misma entrada (ACS de 4,99 kW)
producía tres resultados incompatibles según la comunidad: Aragón la declaraba
exenta, Madrid y Cataluña emitían un aviso informativo, y 11 comunidades exigían
memoria técnica más registro — papeleo del que la norma estatal exime.

Base legal (RD 1027/2007, texto consolidado en el BOE):

  Art. 15.1.b: memoria técnica cuando la potencia es "mayor o igual que 5 kW y
  menor o igual que 70 kW".

  Art. 15.1.c: "no es preceptiva la presentación de la documentación anterior
  para acreditar el cumplimiento reglamentario ante el órgano competente de la
  Comunidad Autónoma para las instalaciones de potencia térmica nominal
  instalada en generación de calor o frío menor que 5 kW".

  Art. 24.2: "Las instalaciones térmicas a las que se refiere el artículo
  15.1.c) no precisarán acreditación del cumplimiento reglamentario ante el
  órgano competente de la Comunidad Autónoma."

Es normativa estatal: las diferencias autonómicas legítimas son la plataforma,
la tasa y el plazo, no si la obligación existe. Los 5 kW son además un umbral
cerrado (inclusive arriba, exclusivo abajo), y ese detalle importa: Galicia
eximía a 5,0 kW exactos.
"""

import pytest

from motor_normativo.clasificador import Clasificador
from schemas.clasificador import ClasificadorInput

COMUNIDADES = [
    "andalucia", "aragon", "asturias", "baleares", "canarias", "cantabria",
    "castilla_la_mancha", "castilla_leon", "cataluna", "comunidad_valenciana",
    "extremadura", "galicia", "la_rioja", "madrid", "murcia", "navarra",
    "pais_vasco",
]

TERMICAS = ["acs", "climatizacion_aerotermia"]


def clasificar(comunidad: str, vertical: str, potencia: float, uso: str = "residencial"):
    return Clasificador().clasificar(
        ClasificadorInput(
            comunidad=comunidad,
            tipo_instalacion=vertical,
            potencia_kw=potencia,
            uso=uso,
            acs_centralizada=False,
            incluida_ambito_legionella=False,
        )
    )


def accionables(plan) -> list:
    """Trámites que la UI presenta como tareas del usuario."""
    return [t for t in plan.tramites if t.tipo_actuacion in (None, "accion_usuario")]


def por_el_rite(tramite) -> bool:
    """¿Este trámite existe por exigencia del RITE?

    La exención de los arts. 15.1.c y 24.2 alcanza a la documentación técnica y
    al registro industrial, no a otras obligaciones que puedan concurrir sobre la
    misma instalación (legionelosis, por ejemplo, que tiene su propia base legal
    y no depende de la potencia). Se distingue por la norma que el trámite cita.
    """
    base = (tramite.base_legal or "").lower()
    return "1027/2007" in base or "rite" in base


@pytest.mark.parametrize("comunidad", COMUNIDADES)
@pytest.mark.parametrize("vertical", TERMICAS)
@pytest.mark.parametrize("uso", ["residencial", "terciario", "industrial"])
def test_por_debajo_de_5kw_no_hay_tramites_rite(comunidad, vertical, uso):
    """Regresión de C-02: 11 comunidades exigían MTD + registro por debajo de 5 kW."""
    plan = clasificar(comunidad, vertical, 4.99, uso)
    pendientes = [t for t in accionables(plan) if por_el_rite(t)]
    assert not pendientes, (
        f"{comunidad}/{vertical} ({uso}) exige {len(pendientes)} trámite(s) de RITE por "
        f"debajo de 5 kW, pero los arts. 15.1.c y 24.2 eximen a estas instalaciones: "
        f"{[t.nombre for t in pendientes]}"
    )


@pytest.mark.parametrize("comunidad", COMUNIDADES)
@pytest.mark.parametrize("vertical", TERMICAS)
def test_a_partir_de_5kw_si_hay_tramite(comunidad, vertical):
    """El umbral es inclusivo por arriba: 5,0 kW exactos ya requieren memoria.

    Galicia eximía a 5,0 kW exactos (usaba <= 5 para la exención y > 5 para la
    memoria), dejando el valor frontera en el lado equivocado.
    """
    plan = clasificar(comunidad, vertical, 5.0)
    assert [t for t in accionables(plan) if por_el_rite(t)], (
        f"{comunidad}/{vertical} no exige ningún trámite de RITE a 5,0 kW, pero el "
        f"art. 15.1.b requiere memoria técnica desde 5 kW inclusive."
    )


@pytest.mark.parametrize("comunidad", COMUNIDADES)
@pytest.mark.parametrize("vertical", TERMICAS)
def test_la_exencion_se_explica_al_usuario(comunidad, vertical):
    """Un plan vacío es indistinguible de un plan roto: hay que decir por qué.

    O bien hay un trámite informativo, o bien una advertencia que lo explique.
    """
    plan = clasificar(comunidad, vertical, 4.99)
    informativos = [t for t in plan.tramites if t.tipo_actuacion == "informativa"]
    explica_advertencia = any(
        "exent" in a.lower() or "no requiere" in a.lower() for a in plan.advertencias
    )
    assert informativos or explica_advertencia, (
        f"{comunidad}/{vertical} devuelve un plan sin trámites por debajo de 5 kW sin "
        f"explicar que la instalación está exenta: en la UI es indistinguible de un error."
    )


@pytest.mark.parametrize("comunidad", COMUNIDADES)
@pytest.mark.parametrize("vertical", TERMICAS)
def test_la_exencion_cita_su_base_legal(comunidad, vertical):
    """Sin base legal citada el usuario no puede contrastar la afirmación."""
    plan = clasificar(comunidad, vertical, 4.99)
    for tramite in plan.tramites:
        assert tramite.base_legal, (
            f"{comunidad}/{vertical}: el trámite '{tramite.nombre}' no cita base legal"
        )


def test_el_umbral_no_afecta_a_las_obligaciones_sanitarias():
    """La exención del RITE es de documentación industrial, no de salud pública.

    Las reglas de legionela tienen su propia base legal (RD 487/2022 y normativa
    autonómica) y no deben desactivarse por potencia.
    """
    for comunidad, regla in [
        ("baleares", "BAL-ACS-003"),
        ("pais_vasco", "PV-ACS-003"),
        ("castilla_leon", "CYL-ACS-003"),
        ("aragon", "ARA-ACS-003"),
    ]:
        plan = Clasificador().clasificar(
            ClasificadorInput(
                comunidad=comunidad,
                tipo_instalacion="acs",
                potencia_kw=40.0,
                uso="terciario",
                uso_colectivo=True,
            )
        )
        assert regla in {t.regla_id for t in plan.tramites}, (
            f"{comunidad}: la regla sanitaria {regla} dejó de dispararse"
        )
