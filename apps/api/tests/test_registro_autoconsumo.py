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

**La práctica autonómica no es uniforme**, y verificarla comunidad a comunidad
(2026-08-11) dio tres resultados distintos:

- **Andalucía y Madrid** siguen el mínimo estatal: de oficio por debajo de
  100 kW en BT, a solicitud por encima o en AT.
- **Baleares** va más allá: la ventanilla de tramitación de la CAIB (paso 7)
  confirma que la Dirección General inscribe de oficio hasta 500 kW.
- **Aragón** no aplica el automatismo: la ficha del procedimiento 2459 exige la
  inscripción "independientemente de la modalidad de autoconsumo, de la potencia
  instalada del equipo generador y de la tensión a la que estén conectados".

Es decir, aplicar el criterio estatal por defecto a las cuatro habría sido
incorrecto en dos de ellas. Por eso los tests distinguen por comunidad en vez de
imponer una regla única: la diferencia es el dato, no el ruido.
"""

import pytest

from motor_normativo.clasificador import Clasificador
from schemas.clasificador import ClasificadorInput

# Comunidades que siguen el umbral estatal de 100 kW, y el fragmento que
# identifica el trámite de registro de autoconsumo en su plan.
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


class TestBalearesVaMasAlla:
    """La CAIB inscribe de oficio hasta 500 kW, no solo hasta 100."""

    @pytest.mark.parametrize("potencia", [20.0, 99.0, 150.0, 500.0])
    def test_de_oficio_en_todo_el_rango_de_pequena_potencia(self, potencia):
        tramite = tramite_registro("baleares", "Registro de autoconsumo", potencia, "BT")
        assert tramite.tipo_actuacion == "oficio_administracion"

    def test_no_se_mezcla_con_el_registro_de_produccion(self):
        """Antes viajaban fusionados en un solo trámite, así que el registro de
        producción (que sí presenta el titular) arrastraba consigo una
        inscripción que en realidad hace la Administración."""
        nombres = [t.nombre for t in plan("baleares", 20.0, "BT").tramites]
        fusionados = [n for n in nombres if "034" in n and "autoconsumo" in n.lower()]
        assert not fusionados, f"Siguen fusionados: {fusionados}"

    def test_el_registro_de_produccion_sigue_siendo_del_titular(self):
        resultado = plan("baleares", 20.0, "BT")
        proc_034 = [t for t in resultado.tramites if "034" in t.nombre]
        assert len(proc_034) == 1
        assert proc_034[0].tipo_actuacion == "accion_usuario"


class TestAragonNoAplicaElAutomatismo:
    """Aragón exige la inscripción siempre, por decisión propia.

    Ficha del procedimiento 2459: "Todos los sujetos consumidores que realicen
    autoconsumo, independientemente de la modalidad de autoconsumo a la que estén
    acogidos, de la potencia instalada del equipo generador y de la tensión a la
    que estén conectados."
    """

    @pytest.mark.parametrize("potencia,tension", [(20.0, "BT"), (99.0, "BT"), (150.0, "AT")])
    def test_siempre_la_solicita_el_titular(self, potencia, tension):
        tramite = tramite_registro("aragon", "RADNE", potencia, tension)
        assert tramite.tipo_actuacion == "accion_usuario", (
            "Aragón no aplica la inscripción de oficio: su ficha oficial la exige "
            "con independencia de potencia y tensión."
        )

    def test_referencia_el_formulario_real(self):
        tramite = tramite_registro("aragon", "RADNE", 20.0, "BT")
        assert tramite.formulario_ref == "F107"

    def test_la_documentacion_cambia_en_los_100_kw(self):
        """Hasta 100 kW se acredita con el certificado de instalación
        diligenciado; por encima, con la autorización de explotación."""
        hasta = tramite_registro("aragon", "RADNE", 100.0, "BT")
        mas = tramite_registro("aragon", "RADNE", 150.0, "AT")
        ids_hasta = {d.id for d in hasta.documentos_requeridos}
        ids_mas = {d.id for d in mas.documentos_requeridos}
        assert "certificado_instalacion_c0004" in ids_hasta
        assert "autorizacion_explotacion" in ids_mas
        assert ids_hasta != ids_mas
