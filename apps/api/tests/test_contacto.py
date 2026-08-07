"""Tests del endpoint público /contacto (auditoría 2026-08-06).

Primer test de router HTTP del proyecto (ver hallazgo B-15: hasta ahora
ningún endpoint tenía cobertura con TestClient). Cubre: el gate global de
INTERNAL_API_KEY sigue aplicándose a esta ruta nueva, el rate limit, el
honeypot anti-spam, y el caso de Resend sin configurar.
"""

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from config import settings
from main import app
from servicios.rate_limit import get_redis

PAYLOAD_VALIDO = {
    "nombre": "Ana García",
    "email": "ana@example.com",
    "mensaje": "Necesito información sobre instalación fotovoltaica industrial.",
}


class _FakeRedis:
    """Sustituye a redis.asyncio.Redis para los tests: mismo contrato
    (incr/expire) sin necesitar un Redis real."""

    def __init__(self):
        self.counts: dict[str, int] = {}

    async def incr(self, key: str) -> int:
        self.counts[key] = self.counts.get(key, 0) + 1
        return self.counts[key]

    async def expire(self, key: str, ttl: int) -> None:
        pass


@pytest.fixture
def fake_redis():
    return _FakeRedis()


@pytest.fixture
def client(fake_redis):
    async def _override_get_redis():
        yield fake_redis

    app.dependency_overrides[get_redis] = _override_get_redis
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _headers():
    return {"X-Internal-Key": settings.INTERNAL_API_KEY}


def test_sin_internal_key_devuelve_401(client):
    resp = client.post("/contacto", json=PAYLOAD_VALIDO)
    assert resp.status_code == 401


def test_payload_invalido_devuelve_422(client):
    resp = client.post("/contacto", json={"nombre": "A", "email": "no-es-un-email"}, headers=_headers())
    assert resp.status_code == 422


def test_honeypot_relleno_no_envia_email_pero_responde_200(client):
    payload = {**PAYLOAD_VALIDO, "empresa_web": "http://spam.example"}
    with patch("routers.contacto.resend.Emails.send") as mock_send:
        resp = client.post("/contacto", json=payload, headers=_headers())
    assert resp.status_code == 200
    assert resp.json()["estado"] == "recibido"
    mock_send.assert_not_called()


def test_envio_exitoso_llama_a_resend(client):
    with patch("routers.contacto.resend.Emails.send") as mock_send:
        resp = client.post("/contacto", json=PAYLOAD_VALIDO, headers=_headers())
    assert resp.status_code == 200
    assert resp.json()["estado"] == "recibido"
    mock_send.assert_called_once()
    kwargs = mock_send.call_args[0][0]
    assert kwargs["reply_to"] == PAYLOAD_VALIDO["email"]
    assert "Ana Garc" in kwargs["subject"]


def test_mensaje_del_usuario_se_escapa_en_el_html(client):
    payload = {**PAYLOAD_VALIDO, "mensaje": "<script>alert(1)</script> hola, esto es un mensaje real"}
    with patch("routers.contacto.resend.Emails.send") as mock_send:
        resp = client.post("/contacto", json=payload, headers=_headers())
    assert resp.status_code == 200
    html = mock_send.call_args[0][0]["html"]
    assert "<script>" not in html
    assert "&lt;script&gt;" in html


def test_resend_no_configurado_devuelve_503(client, monkeypatch):
    monkeypatch.setattr(settings, "RESEND_API_KEY", None)
    resp = client.post("/contacto", json=PAYLOAD_VALIDO, headers=_headers())
    assert resp.status_code == 503


def test_rate_limit_bloquea_a_partir_de_la_sexta_peticion(client):
    with patch("routers.contacto.resend.Emails.send"):
        for _ in range(5):
            resp = client.post("/contacto", json=PAYLOAD_VALIDO, headers=_headers())
            assert resp.status_code == 200
        resp = client.post("/contacto", json=PAYLOAD_VALIDO, headers=_headers())
    assert resp.status_code == 429
