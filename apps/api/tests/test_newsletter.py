"""Tests del endpoint público /newsletter (suscripción a alertas del BOE).

Mismo patrón que test_contacto.py: TestClient + dependency_overrides. En vez
de mockear Resend, mockeamos la sesión de base de datos con un fake ligero
(este repo no tiene aiosqlite/pytest-asyncio configurado para tests de
integración reales contra Postgres, así que seguimos la misma convención de
_FakeRedis ya usada en test_contacto.py).
"""

import pytest
from fastapi.testclient import TestClient

from config import settings
from database import get_db
from main import app
from models.newsletter import NewsletterSuscriptor
from servicios.rate_limit import get_redis

PAYLOAD_VALIDO = {"email": "ana@example.com"}


class _FakeRedis:
    def __init__(self):
        self.counts: dict[str, int] = {}

    async def incr(self, key: str) -> int:
        self.counts[key] = self.counts.get(key, 0) + 1
        return self.counts[key]

    async def expire(self, key: str, ttl: int) -> None:
        pass


class _FakeSession:
    """Sustituye a AsyncSession: guarda suscriptores en un dict en memoria
    (email -> objeto), compartido entre peticiones del mismo test.

    `scalar` extrae el email buscado de los parámetros compilados del
    `select(...).where(NewsletterSuscriptor.email == email)` real que
    construye el router, en vez de reimplementar un motor SQL de juguete.
    """

    def __init__(self, almacen: dict[str, NewsletterSuscriptor]):
        self._almacen = almacen
        self._pendiente: NewsletterSuscriptor | None = None

    async def scalar(self, stmt):
        params = list(stmt.compile().params.values())
        email_buscado = params[0] if params else None
        return self._almacen.get(email_buscado)

    def add(self, obj: NewsletterSuscriptor):
        self._pendiente = obj

    async def commit(self):
        if self._pendiente is not None:
            self._almacen[self._pendiente.email] = self._pendiente
            self._pendiente = None

    async def rollback(self):
        self._pendiente = None


@pytest.fixture
def almacen():
    return {}


@pytest.fixture
def fake_redis():
    return _FakeRedis()


@pytest.fixture
def client(almacen, fake_redis):
    async def _override_get_redis():
        yield fake_redis

    async def _override_get_db():
        yield _FakeSession(almacen)

    app.dependency_overrides[get_redis] = _override_get_redis
    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _headers():
    return {"X-Internal-Key": settings.INTERNAL_API_KEY}


def test_sin_internal_key_devuelve_401(client):
    resp = client.post("/newsletter", json=PAYLOAD_VALIDO)
    assert resp.status_code == 401


def test_email_invalido_devuelve_422(client):
    resp = client.post("/newsletter", json={"email": "no-es-un-email"}, headers=_headers())
    assert resp.status_code == 422


def test_honeypot_relleno_no_persiste_pero_responde_200(client, almacen):
    payload = {**PAYLOAD_VALIDO, "empresa_web": "http://spam.example"}
    resp = client.post("/newsletter", json=payload, headers=_headers())
    assert resp.status_code == 200
    assert resp.json()["estado"] == "suscrito"
    assert almacen == {}


def test_suscripcion_exitosa_persiste_el_email(client, almacen):
    resp = client.post("/newsletter", json=PAYLOAD_VALIDO, headers=_headers())
    assert resp.status_code == 200
    assert resp.json()["estado"] == "suscrito"
    assert "ana@example.com" in almacen


def test_email_se_normaliza_a_minusculas(client, almacen):
    resp = client.post("/newsletter", json={"email": "Ana@Example.COM"}, headers=_headers())
    assert resp.status_code == 200
    assert "ana@example.com" in almacen


def test_suscripcion_repetida_es_idempotente(client, almacen):
    resp1 = client.post("/newsletter", json=PAYLOAD_VALIDO, headers=_headers())
    resp2 = client.post("/newsletter", json=PAYLOAD_VALIDO, headers=_headers())
    assert resp1.status_code == 200
    assert resp2.status_code == 200
    assert len(almacen) == 1


def test_rate_limit_bloquea_a_partir_de_la_sexta_peticion(client):
    for i in range(5):
        resp = client.post(
            "/newsletter", json={"email": f"user{i}@example.com"}, headers=_headers()
        )
        assert resp.status_code == 200
    resp = client.post("/newsletter", json={"email": "otro@example.com"}, headers=_headers())
    assert resp.status_code == 429
