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


class TestExencionPorTipoDeEquipo:
    """Segundo y tercer supuesto del art. 15.1.c, que aplican solo a ACS:

      "[...] las instalaciones de producción de agua caliente sanitaria por medio
      de calentadores instantáneos, calentadores acumuladores, termos eléctricos
      cuando la potencia térmica nominal de cada uno de ellos por separado o su
      suma sea menor o igual que 70 kW y los sistemas solares consistentes en un
      único elemento prefabricado."

    Estaban anotados como hueco en 13 ficheros porque el formulario no preguntaba
    el tipo de equipo. Sin ese dato, un termo eléctrico de 60 kW recibía el mismo
    plan que una caldera de 60 kW.
    """

    EXENTOS = ["calentador_instantaneo", "calentador_acumulador", "termo_electrico"]
    NO_EXENTOS = ["caldera", "bomba_calor", "otro"]

    def _acs(self, comunidad, potencia, tipo=None):
        datos = dict(
            comunidad=comunidad,
            tipo_instalacion="acs",
            potencia_kw=potencia,
            uso="residencial",
            acs_centralizada=False,
            incluida_ambito_legionella=False,
        )
        if tipo:
            datos["tipo_generador_acs"] = tipo
        plan = Clasificador().clasificar(ClasificadorInput(**datos))
        return [t for t in accionables(plan) if por_el_rite(t)]

    @pytest.mark.parametrize("comunidad", COMUNIDADES)
    @pytest.mark.parametrize("tipo", EXENTOS)
    def test_calentadores_y_termos_hasta_70kw_estan_exentos(self, comunidad, tipo):
        assert not self._acs(comunidad, 60.0, tipo), (
            f"{comunidad}: un {tipo} de 60 kW no debería requerir documentación RITE"
        )

    @pytest.mark.parametrize("comunidad", COMUNIDADES)
    def test_el_solar_prefabricado_esta_exento(self, comunidad):
        assert not self._acs(comunidad, 60.0, "sistema_solar_prefabricado")

    @pytest.mark.parametrize("comunidad", COMUNIDADES)
    def test_el_limite_de_70kw_es_inclusivo(self, comunidad):
        """"menor o igual que 70 kW": a 70,0 exime; por encima, no."""
        assert not self._acs(comunidad, 70.0, "termo_electrico")
        assert self._acs(comunidad, 70.01, "termo_electrico"), (
            f"{comunidad}: por encima de 70 kW el termo eléctrico deja de estar exento"
        )

    @pytest.mark.parametrize("comunidad", COMUNIDADES)
    @pytest.mark.parametrize("tipo", NO_EXENTOS)
    def test_los_equipos_no_listados_siguen_requiriendo_documentacion(self, comunidad, tipo):
        assert self._acs(comunidad, 60.0, tipo), (
            f"{comunidad}: un {tipo} de 60 kW sí requiere documentación RITE"
        )

    @pytest.mark.parametrize("comunidad", COMUNIDADES)
    def test_sin_informar_el_equipo_el_plan_no_cambia(self, comunidad):
        """Retrocompatibilidad: el campo es opcional y `in(None, [...])` es falso,
        así que un expediente antiguo sigue recibiendo el mismo plan."""
        sin_dato = self._acs(comunidad, 60.0)
        con_caldera = self._acs(comunidad, 60.0, "caldera")
        assert [t.nombre for t in sin_dato] == [t.nombre for t in con_caldera]

    @pytest.mark.parametrize("comunidad", COMUNIDADES)
    def test_no_se_duplica_la_exencion_por_debajo_de_5kw(self, comunidad):
        """A 3 kW con termo eléctrico concurren los supuestos 1 y 2: debe salir
        un solo aviso, no dos que digan lo mismo."""
        plan = Clasificador().clasificar(
            ClasificadorInput(
                comunidad=comunidad, tipo_instalacion="acs", potencia_kw=3.0,
                uso="residencial", tipo_generador_acs="termo_electrico",
                acs_centralizada=False, incluida_ambito_legionella=False,
            )
        )
        informativos = [t for t in plan.tramites if t.tipo_actuacion == "informativa"]
        assert len(informativos) <= 1, (
            f"{comunidad}: {len(informativos)} avisos de exención solapados: "
            f"{[t.nombre for t in informativos]}"
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
