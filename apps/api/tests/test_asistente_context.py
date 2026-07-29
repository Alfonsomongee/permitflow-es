import pytest

from servicios.asistente_context import severidad_verificacion, construir_contexto


# --- severidad_verificacion ---

def test_severidad_estado_no_verificado_es_critico():
    """Caso real: aragon/fotovoltaica_autoconsumo.json — nivel_verificacion='generica'
    pero estado='borrador_no_verificado'. estado debe primar sobre nivel."""
    normativa = {"nivel_verificacion": "generica", "estado": "borrador_no_verificado"}
    assert severidad_verificacion(normativa) == "critico"


def test_severidad_nivel_generica_sin_estado_es_critico():
    normativa = {"nivel_verificacion": "generica"}
    assert severidad_verificacion(normativa) == "critico"


def test_severidad_parcial_es_atencion():
    normativa = {"nivel_verificacion": "verificada_parcialmente"}
    assert severidad_verificacion(normativa) == "atencion"

    normativa2 = {"nivel_verificacion": "verificada", "estado": "revision_parcial"}
    assert severidad_verificacion(normativa2) == "atencion"


def test_severidad_verificada_sin_huecos_es_verificada():
    normativa = {"nivel_verificacion": "verificada"}
    assert severidad_verificacion(normativa) == "verificada"


# --- construir_contexto: Layer 3 debe exponer estado/aviso/huecos, no solo nivel ---

def test_construir_contexto_incluye_huecos_y_estado_cuando_existen(monkeypatch):
    normativa_falsa = {
        "nivel_verificacion": "generica",
        "estado": "borrador_no_verificado",
        "aviso": "Pendiente de contraste con el organismo autonómico.",
        "huecos_verificacion": [
            "Umbral de potencia sin respaldo normativo confirmado.",
            "Trámite de acceso a red no localizado en fuente oficial.",
        ],
        "reglas": [],
    }

    import servicios.asistente_context as ctx_mod
    monkeypatch.setattr(ctx_mod, "_cargar_normativa", lambda comunidad, tipo: normativa_falsa)

    contexto = construir_contexto(
        expediente=None,
        params={"comunidad": "aragon", "tipo_instalacion": "fotovoltaica_autoconsumo"},
    )

    assert "borrador_no_verificado" in contexto
    assert "Pendiente de contraste con el organismo autonómico." in contexto
    assert "Umbral de potencia sin respaldo normativo confirmado." in contexto
    # Debe usar el lenguaje de máxima severidad, no el genérico anterior
    assert "MÁS BAJO" in contexto


def test_construir_contexto_verificada_no_alarma_de_mas(monkeypatch):
    normativa_falsa = {
        "nivel_verificacion": "verificada",
        "reglas": [],
    }

    import servicios.asistente_context as ctx_mod
    monkeypatch.setattr(ctx_mod, "_cargar_normativa", lambda comunidad, tipo: normativa_falsa)

    contexto = construir_contexto(
        expediente=None,
        params={"comunidad": "andalucia", "tipo_instalacion": "acs"},
    )

    assert "Puedes afirmar con seguridad" in contexto
    assert "MÁS BAJO" not in contexto
