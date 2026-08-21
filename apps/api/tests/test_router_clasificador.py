"""Tests de integración HTTP para POST /api/v1/clasificador.

Origen: auditoría de testing 2026-08-20. routers/clasificador.py tenía 53%
de cobertura de líneas pese a que motor_normativo/clasificador.py (la lógica
que envuelve) está al 87-100% -- es decir, la capa HTTP real que expone el
producto (gate de autenticación, serialización de la respuesta, 404/500) no
tenía ni un test. Es el endpoint más importante de la aplicación.
"""
from fastapi.testclient import TestClient

from config import settings
from main import app

client = TestClient(app)


def _headers():
    return {"X-Internal-Key": settings.INTERNAL_API_KEY}


def test_sin_clave_interna_devuelve_401():
    resp = client.post(
        "/api/v1/clasificador",
        json={
            "tipo_instalacion": "acs", "comunidad": "andalucia",
            "potencia_kw": 3, "uso": "residencial",
        },
    )
    assert resp.status_code == 401


def test_clasificacion_exitosa_devuelve_200_con_tramites():
    resp = client.post(
        "/api/v1/clasificador",
        json={
            "tipo_instalacion": "acs", "comunidad": "andalucia",
            "potencia_kw": 3, "uso": "residencial", "uso_colectivo": False,
        },
        headers=_headers(),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["tramites"]) >= 1
    assert body["tramites"][0]["regla_id"] == "AND-ACS-RITE-EXENTA"


def test_combinacion_sin_normativa_devuelve_404():
    # Canarias/gas industrial a presión alta: hueco declarado en
    # huecos_verificacion, el motor no inventa un trámite.
    resp = client.post(
        "/api/v1/clasificador",
        json={
            "tipo_instalacion": "gas_baja_presion", "comunidad": "canarias",
            "potencia_kw": 500, "uso": "industrial", "presion_bar": "5+",
        },
        headers=_headers(),
    )
    assert resp.status_code == 404


def test_input_invalido_devuelve_422_no_500():
    # potencia_kw<=0 lo rechaza el schema (gt=0): debe ser un 422 de
    # validación de FastAPI, no llegar a intentar clasificar.
    resp = client.post(
        "/api/v1/clasificador",
        json={
            "tipo_instalacion": "acs", "comunidad": "andalucia",
            "potencia_kw": -3, "uso": "residencial",
        },
        headers=_headers(),
    )
    assert resp.status_code == 422


def test_comunidad_desconocida_devuelve_422():
    resp = client.post(
        "/api/v1/clasificador",
        json={
            "tipo_instalacion": "acs", "comunidad": "ceuta",
            "potencia_kw": 10, "uso": "residencial", "uso_colectivo": False,
        },
        headers=_headers(),
    )
    assert resp.status_code == 422


def test_irve_sin_campos_obligatorios_devuelve_422():
    # modo_recarga/ubicacion_irve obligatorios desde el cierre de
    # Prioridad 1 (2026-08-20): confirma que la validación llega hasta la
    # capa HTTP, no solo a ClasificadorInput en tests unitarios.
    resp = client.post(
        "/api/v1/clasificador",
        json={
            "tipo_instalacion": "irve", "comunidad": "madrid",
            "potencia_kw": 11, "uso": "residencial",
        },
        headers=_headers(),
    )
    assert resp.status_code == 422
