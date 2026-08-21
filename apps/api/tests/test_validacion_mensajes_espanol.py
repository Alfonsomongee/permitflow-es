"""Los errores 422 de Pydantic deben llegar en español al frontend.

Pydantic v2 no traduce sus mensajes de validación "de fábrica" (Field(gt=0),
Field(ge=1), tipos...): sin esto, un formulario integramente en español
mostraba textos como "Input should be greater than 0" en el primer error
de validación que no viniera de un @model_validator personalizado (esos
sí estaban en español desde antes). Plan de acción consolidado
2026-08-12, P-18.
"""

from fastapi.testclient import TestClient

from config import settings
from main import _traducir_mensaje_pydantic, app


def _headers():
    return {"X-Internal-Key": settings.INTERNAL_API_KEY}


def test_traduce_mensajes_de_fabrica_de_pydantic():
    casos = {
        "Field required": "Campo obligatorio.",
        "Input should be greater than 0": "Debe ser mayor que 0.",
        "Input should be greater than or equal to 1": "Debe ser mayor o igual que 1.",
        "Input should be a valid number, unable to parse string as a number": "Debe ser un número válido.",
        "Input should be a valid integer, unable to parse string as an integer": "Debe ser un número entero válido.",
        "Input should be a valid string": "Debe ser un texto válido.",
    }
    for original, esperado in casos.items():
        assert _traducir_mensaje_pydantic(original) == esperado


def test_traduce_listado_de_valores_permitidos():
    original = "Input should be 'gas_natural', 'glp_deposito' or 'glp_envases'"
    traducido = _traducir_mensaje_pydantic(original)
    assert traducido.startswith("El valor debe ser")
    assert " or " not in traducido  # el conector se tradujo, no solo se listó tal cual


def test_traduce_restricciones_de_longitud_de_string():
    # routers/contacto.py::ContactoInput (min_length/max_length en nombre y
    # mensaje) es el único sitio del repo que dispara estos mensajes -- no
    # tenían traducción hasta la auditoría UX 2026-08-21 y llegaban en
    # inglés al único formulario público sin sesión Clerk.
    casos = {
        "String should have at least 2 characters": "Debe tener al menos 2 caracteres.",
        "String should have at most 120 characters": "Debe tener como máximo 120 caracteres.",
        "String should have at least 10 characters": "Debe tener al menos 10 caracteres.",
    }
    for original, esperado in casos.items():
        assert _traducir_mensaje_pydantic(original) == esperado


def test_traduce_mensaje_de_email_invalido():
    original = "value is not a valid email address: An email address must have an @-sign."
    assert _traducir_mensaje_pydantic(original) == "No es una dirección de correo electrónico válida."


def test_mensaje_sin_traduccion_conocida_se_devuelve_igual():
    # Defensa: si aparece un mensaje de Pydantic que no reconocemos, es
    # preferible mostrarlo tal cual (en inglés) a inventarnos una traducción.
    assert _traducir_mensaje_pydantic("Algo totalmente inesperado") == "Algo totalmente inesperado"


def test_potencia_negativa_devuelve_mensaje_en_espanol():
    with TestClient(app) as client:
        resp = client.post(
            "/api/v1/clasificador",
            json={
                "tipo_instalacion": "fotovoltaica_autoconsumo",
                "comunidad": "andalucia",
                "potencia_kw": 0,
                "uso": "residencial",
            },
            headers=_headers(),
        )
    assert resp.status_code == 422
    detail = resp.json()["detail"]
    assert "Input should be" not in detail
    assert "Debe ser mayor que 0" in detail


def test_campo_requerido_ausente_devuelve_mensaje_en_espanol():
    with TestClient(app) as client:
        resp = client.post(
            "/api/v1/clasificador",
            json={
                "tipo_instalacion": "irve",
                "comunidad": "andalucia",
                "potencia_kw": 5,
                "uso": "residencial",
                "numero_puntos": 0,
            },
            headers=_headers(),
        )
    assert resp.status_code == 422
    detail = resp.json()["detail"]
    assert "Input should be" not in detail
    assert "Debe ser mayor o igual que 1" in detail


def test_contacto_con_datos_invalidos_devuelve_mensaje_en_espanol():
    # /contacto en producción solo es alcanzable a través del proxy de
    # apps/web (que añade X-Internal-Key server-side, ver app/api/contacto/
    # route.ts) -- reproduce el bug en vivo encontrado en la auditoría UX
    # 2026-08-21 (curl directo, con la clave interna, devolvía el texto de
    # Pydantic sin traducir).
    with TestClient(app) as client:
        resp = client.post(
            "/contacto",
            json={"nombre": "A", "email": "no-es-un-email", "mensaje": "corto"},
            headers=_headers(),
        )
    assert resp.status_code == 422
    detail = resp.json()["detail"]
    assert "String should have" not in detail
    assert "value is not a valid email" not in detail
    assert "Debe tener al menos 2 caracteres" in detail
    assert "No es una dirección de correo electrónico válida" in detail
    assert "Debe tener al menos 10 caracteres" in detail
