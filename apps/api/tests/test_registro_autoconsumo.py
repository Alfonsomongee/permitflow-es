"""La inscripción en el registro de autoconsumo es de oficio por debajo de 100 kW en BT.

Origen: auditoría QA 2026-08-11, reformulación del hallazgo A-03.

Base legal — art. 9.4 de la Ley 24/2013 del Sector Eléctrico, en la redacción
dada por el RDL 15/2018, citado literalmente en el manual de tramitación de
autoconsumo de la Secretaría General de Industria, Energía y Minas de la Junta
de Andalucía (apartados 5.1.7 y 5.2.7):

  "Para aquellos sujetos consumidores conectados a baja tensión, en los que la
  instalación generadora sea de baja tensión y la potencia instalada de
  generación sea menor de 100 kW que realicen autoconsumo, la inscripción se
  llevará a cabo de oficio por las Comunidades Autónomas [...]. Para el resto de
  instalaciones [...] con potencias mayores de 100 kW o aquellas que no sean en
  BT tendrán que presentar solicitud de inscripción."

Es una obligación de la Administración, no del ciudadano, así que no admite
especialidad autonómica: ninguna comunidad puede convertirla en trámite del
usuario. Lo relevante para el producto es que un trámite de oficio no debe
contar como tarea pendiente ni llevar coste ni formulario asociado.

Nota sobre el alcance: este test cubre las comunidades que hoy modelan el
trámite de forma explícita. Aragón no lo emite en ningún tramo y Baleares lo
mezcla con el registro de producción en un único trámite; ambos casos están
documentados como huecos en sus ficheros y no se fuerzan aquí, porque separarlos
sin una fuente autonómica que lo respalde sería inventar normativa.
"""

import pytest

from motor_normativo.clasificador import Clasificador
from schemas.clasificador import ClasificadorInput

# Comunidades que modelan el registro de autoconsumo como trámite propio, y el
# fragmento que identifica ese trámite en su plan.
MODELAN_REGISTRO = [
    ("andalucia", "RADNE"),
    ("madrid", "Registro Administrativo de Autoconsumo"),
]


def plan(comunidad: str, potencia: float, tension: str):
    return Clasificador().clasificar(
        ClasificadorInput(
            comunidad=comunidad,
            tipo_instalacion="fotovoltaica_autoconsumo",
            potencia_kw=potencia,
            uso="terciario",
            tension=tension,
            modalidad_autoconsumo="con_excedentes_con_compensacion",
        )
    )


def tramite_registro(comunidad: str, marca: str, potencia: float, tension: str):
    encontrados = [t for t in plan(comunidad, potencia, tension).tramites if marca in t.nombre]
    assert len(encontrados) == 1, (
        f"{comunidad} a {potencia} kW {tension}: se esperaba exactamente un trámite de "
        f"registro de autoconsumo, se encontraron {len(encontrados)}"
    )
    return encontrados[0]


@pytest.mark.parametrize("comunidad,marca", MODELAN_REGISTRO)
@pytest.mark.parametrize("potencia", [20.0, 99.0, 99.99])
def test_por_debajo_de_100kw_en_bt_es_de_oficio(comunidad, marca, potencia):
    tramite = tramite_registro(comunidad, marca, potencia, "BT")
    assert tramite.tipo_actuacion == "oficio_administracion", (
        f"{comunidad} presenta la inscripción a {potencia} kW en BT como "
        f"'{tramite.tipo_actuacion}', pero la Ley 24/2013 art. 9.4 la atribuye de oficio "
        f"a la comunidad autónoma."
    )


@pytest.mark.parametrize("comunidad,marca", MODELAN_REGISTRO)
@pytest.mark.parametrize(
    "potencia,tension",
    [(100.0, "BT"), (150.0, "BT"), (150.0, "AT"), (50.0, "AT")],
)
def test_a_partir_de_100kw_o_en_at_lo_solicita_el_titular(comunidad, marca, potencia, tension):
    """El umbral es inclusivo: a 100 kW exactos ya deja de ser de oficio."""
    tramite = tramite_registro(comunidad, marca, potencia, tension)
    assert tramite.tipo_actuacion in (None, "accion_usuario"), (
        f"{comunidad} a {potencia} kW {tension} presenta la inscripción como "
        f"'{tramite.tipo_actuacion}', pero fuera del supuesto BT/BT/<100 kW debe "
        f"solicitarla el titular."
    )


@pytest.mark.parametrize("comunidad,marca", MODELAN_REGISTRO)
def test_el_tramite_de_oficio_no_carga_coste_ni_formulario(comunidad, marca):
    """Un trámite que hace la Administración no puede pedirle papeles ni dinero al usuario.

    En Andalucía este trámite salía con 62,25 € de coste estimado y un formulario
    del MITECO que rellenar, también en el tramo en el que es de oficio.
    """
    tramite = tramite_registro(comunidad, marca, 20.0, "BT")
    assert not tramite.documentos_requeridos, (
        f"{comunidad}: el trámite de oficio pide {len(tramite.documentos_requeridos)} "
        f"documento(s) al usuario"
    )
    assert tramite.formulario_ref is None, (
        f"{comunidad}: el trámite de oficio referencia el formulario "
        f"'{tramite.formulario_ref}'"
    )
    coste = (tramite.coste_estimado or "").lower()
    assert "eur" not in coste and "€" not in coste, (
        f"{comunidad}: el trámite de oficio declara un coste para el titular: "
        f"'{tramite.coste_estimado}'"
    )


@pytest.mark.parametrize("comunidad,marca", MODELAN_REGISTRO)
def test_el_tramite_de_oficio_no_cuenta_como_tarea_pendiente(comunidad, marca):
    """Es la consecuencia práctica: no debe inflar el contador ni el progreso."""
    resultado = plan(comunidad, 20.0, "BT")
    accionables = [
        t for t in resultado.tramites if t.tipo_actuacion in (None, "accion_usuario")
    ]
    assert not any(marca in t.nombre for t in accionables)
