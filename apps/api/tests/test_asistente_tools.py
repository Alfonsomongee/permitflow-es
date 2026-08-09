import asyncio

from servicios.asistente_tools import (
    TOOLS_SCHEMA,
    _formatear_ayudas_disponibles,
    _formatear_estado_tramites,
    ejecutar_tool,
)


class _ExpedienteFalso:
    """Doble simple del modelo SQLAlchemy Expediente -- solo los atributos
    que las tools leen (plan_tramitacion, tramites_estado, comunidad,
    tipo_instalacion)."""

    def __init__(self, plan_tramitacion=None, tramites_estado=None,
                 comunidad="galicia", tipo_instalacion="fotovoltaica_autoconsumo"):
        self.plan_tramitacion = plan_tramitacion or {}
        self.tramites_estado = tramites_estado or {}
        self.comunidad = comunidad
        self.tipo_instalacion = tipo_instalacion


def _expediente_dos_tramites(estado_1="pendiente", estado_2="pendiente"):
    return _ExpedienteFalso(
        plan_tramitacion={
            "tramites": [
                {"orden": 1, "nombre": "Solicitud del CAU"},
                {"orden": 2, "nombre": "Registro PUES"},
            ]
        },
        tramites_estado={
            "1": {"estado": estado_1, "fecha_inicio": "2026-08-01"},
            "2": {"estado": estado_2},
        },
    )


# ─── TOOLS_SCHEMA ────────────────────────────────────────────────────────

def test_tools_schema_tiene_formato_openai_valido():
    nombres = set()
    for tool in TOOLS_SCHEMA:
        assert tool["type"] == "function"
        fn = tool["function"]
        assert fn["name"]
        assert fn["description"]
        assert fn["parameters"]["type"] == "object"
        nombres.add(fn["name"])
    assert nombres == {"consultar_estado_tramites", "consultar_ayudas_disponibles"}


# ─── _formatear_estado_tramites ─────────────────────────────────────────

def test_formatear_estado_tramites_cuenta_completados():
    # El trámite 1 tiene fecha_inicio pero NO fecha_completado en el fixture
    # (_expediente_dos_tramites): debe mostrarse como "iniciado el", no
    # "completado el", aunque su estado ya sea "completado".
    exp = _expediente_dos_tramites(estado_1="completado", estado_2="pendiente")
    resumen = _formatear_estado_tramites(exp)
    assert "1 de 2 trámites completados" in resumen
    assert "Solicitud del CAU" in resumen
    assert "iniciado el 2026-08-01" in resumen
    assert "completado el" not in resumen


def test_formatear_estado_tramites_sin_plan():
    exp = _ExpedienteFalso(plan_tramitacion={})
    resumen = _formatear_estado_tramites(exp)
    assert "no tiene ningún trámite" in resumen


def test_formatear_estado_tramites_trata_pendiente_como_default():
    # Un trámite sin entrada en tramites_estado (JSONB) debe tratarse como
    # "pendiente", no fallar ni omitirse.
    exp = _ExpedienteFalso(
        plan_tramitacion={"tramites": [{"orden": 1, "nombre": "Trámite sin estado"}]},
        tramites_estado={},
    )
    resumen = _formatear_estado_tramites(exp)
    assert "0 de 1 trámites completados" in resumen
    assert "estado: pendiente" in resumen


# ─── _formatear_ayudas_disponibles (usa el catálogo real) ──────────────

def test_formatear_ayudas_disponibles_con_catalogo_real():
    # Galicia + fotovoltaica tiene una entrada real investigada (GAL-FV, INEGA)
    # -- ver servicios/catalogo_ayudas.py y test_ayudas.py.
    exp = _ExpedienteFalso(comunidad="galicia", tipo_instalacion="fotovoltaica_autoconsumo")
    resumen = _formatear_ayudas_disponibles(exp)
    assert "INEGA" in resumen


def test_formatear_ayudas_disponibles_sin_catalogo_usa_aviso_honesto():
    exp = _ExpedienteFalso(comunidad="la_rioja", tipo_instalacion="gas_baja_presion")
    resumen = _formatear_ayudas_disponibles(exp)
    assert "No se ha localizado" in resumen


# ─── ejecutar_tool (dispatcher) ─────────────────────────────────────────
#
# Este repo no tiene pytest-asyncio/anyio configurado para tests (ver
# convención en el resto de tests/): se invoca la corrutina con
# asyncio.run() dentro de un test síncrono normal, en vez de marcar el test
# como async.

def test_ejecutar_tool_sin_expediente_no_lanza():
    resultado = asyncio.run(ejecutar_tool("consultar_estado_tramites", {}, None))
    assert "No hay ningún expediente abierto" in resultado


def test_ejecutar_tool_despacha_estado_tramites():
    exp = _expediente_dos_tramites(estado_1="completado")
    resultado = asyncio.run(ejecutar_tool("consultar_estado_tramites", {}, exp))
    assert "1 de 2" in resultado


def test_ejecutar_tool_despacha_ayudas():
    exp = _ExpedienteFalso(comunidad="galicia", tipo_instalacion="fotovoltaica_autoconsumo")
    resultado = asyncio.run(ejecutar_tool("consultar_ayudas_disponibles", {}, exp))
    assert "INEGA" in resultado


def test_ejecutar_tool_desconocida_no_lanza():
    exp = _expediente_dos_tramites()
    resultado = asyncio.run(ejecutar_tool("borrar_todo_el_expediente", {}, exp))
    assert "Herramienta desconocida" in resultado
