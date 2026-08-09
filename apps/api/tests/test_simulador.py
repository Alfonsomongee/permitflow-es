import uuid

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from database import get_db
from main import app
from models.simulacion import AnalisisFactura
from servicios.informes_ia import InformeSimulacionIA, EscenarioAhorro, Incentivo
from servicios.rate_limit import get_redis

def test_informe_simulacion_ia_schema_valido():
    # Verifica que el esquema acepte datos correctos
    data = {
        "supuestos_utilizados": [
            {
                "parametro": "Consumo Anual",
                "valor_asumido": "3500 kWh",
                "razon": "Leído de la factura",
                "fuente_dato": "leido"
            }
        ],
        "incentivos_fiscales": [
            {
                "nombre": "Deducción IRPF",
                "descripcion": "Deducción estatal del 40%",
                "ahorro_estimado": 1500,
                "nivel_verificacion": "pending_verification"
            },
            {
                "nombre": "Bonificación IBI",
                "descripcion": "Bonificación del 50%",
                "ahorro_estimado": 200,
                "nivel_verificacion": "verified",
                "fuente": "Ordenanza Fiscal Municipio"
            }
        ],
        "escenarios": [
            {
                "nombre": "Escenario 1",
                "coste_inicial": 5000,
                "ahorro_anual": 800,
                "ahorro_5_anios": 4000,
                "ahorro_10_anios": 8000,
                "tiempo_retorno_anios": 6.25,
                "potencia_kwp": 4.5
            }
        ],
        "recomendacion_final": "Recomendamos el Escenario 1."
    }

    informe = InformeSimulacionIA(**data)
    assert len(informe.escenarios) == 1
    assert informe.escenarios[0].ahorro_10_anios == 8000
    assert informe.incentivos_fiscales[0].nivel_verificacion == "pending_verification"
    assert informe.incentivos_fiscales[1].nivel_verificacion == "verified"


def test_informe_simulacion_ia_invalido_niveles_verificacion():
    # Verifica que niveles de verificación no permitidos lancen error
    with pytest.raises(ValidationError):
        Incentivo(
            nombre="Falso Incentivo",
            descripcion="Deducción",
            ahorro_estimado=1000,
            nivel_verificacion="inventado"
        )

def test_escenario_ahorro_valida_campos_requeridos():
    # Verifica que campos como ahorro_10_anios o potencia_kwp sean requeridos
    with pytest.raises(ValidationError):
        EscenarioAhorro(
            nombre="Falta info",
            coste_inicial=1000,
            ahorro_anual=200,
            tiempo_retorno_anios=5
            # Faltan ahorro_5_anios, ahorro_10_anios y potencia_kwp
        )


def test_escenario_ahorro_factura_actual_vs_con_instalacion():
    # Contrato de apps/web/types/simulador.ts: estos dos campos alimentan la
    # gráfica de factura real antes/después de la instalación.
    escenario = EscenarioAhorro(
        nombre="Escenario 1",
        coste_inicial=5000,
        ahorro_anual=800,
        ahorro_5_anios=4000,
        ahorro_10_anios=8000,
        tiempo_retorno_anios=6.25,
        potencia_kwp=4.5,
        factura_actual_anual=1200,
        factura_con_instalacion_anual=400,
    )
    assert escenario.factura_actual_anual == 1200
    assert escenario.factura_con_instalacion_anual == 400

    # Si no se pasan, no deben ser obligatorios (compatibilidad hacia atrás
    # con cualquier caller que aún no los conozca) y no deben ser negativos.
    sin_factura = EscenarioAhorro(
        nombre="Sin factura",
        coste_inicial=1000,
        ahorro_anual=200,
        ahorro_5_anios=1000,
        ahorro_10_anios=2000,
        tiempo_retorno_anios=5,
        potencia_kwp=3,
    )
    assert sin_factura.factura_actual_anual == 0.0
    assert sin_factura.factura_con_instalacion_anual == 0.0

    with pytest.raises(ValidationError):
        EscenarioAhorro(
            nombre="Factura negativa",
            coste_inicial=1000,
            ahorro_anual=200,
            ahorro_5_anios=1000,
            ahorro_10_anios=2000,
            tiempo_retorno_anios=5,
            potencia_kwp=3,
            factura_actual_anual=-100,
        )


# ---------------------------------------------------------------------------
# POST /simulador/factura/csv (import de consumo de Datadis)
# ---------------------------------------------------------------------------


class _FakeRedis:
    def __init__(self):
        self.counts: dict[str, int] = {}

    async def incr(self, key: str) -> int:
        self.counts[key] = self.counts.get(key, 0) + 1
        return self.counts[key]

    async def expire(self, key: str, ttl: int) -> None:
        pass


class _FakeSession:
    """Simula lo mínimo de AsyncSession que usa el endpoint: add/commit/refresh.
    Asigna un id (como haría un flush real) si el objeto no lo tiene ya."""

    def add(self, obj):
        if getattr(obj, "id", None) is None:
            obj.id = uuid.uuid4()
        self._ultimo = obj

    async def commit(self):
        pass

    async def refresh(self, obj):
        pass


@pytest.fixture
def fake_redis():
    return _FakeRedis()


@pytest.fixture
def client(fake_redis):
    async def _override_get_redis():
        yield fake_redis

    async def _override_get_db():
        yield _FakeSession()

    app.dependency_overrides[get_redis] = _override_get_redis
    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _csv_anual_simple() -> bytes:
    from datetime import date, timedelta

    filas = ["CUPS;Fecha;Hora;Consumo_kWh;Metodo_obtencion"]
    inicio = date(2024, 1, 1)
    for i in range(365):
        dia = inicio + timedelta(days=i)
        filas.append(f"ES0022000006025866PZ1P;{dia.strftime('%d/%m/%Y')};1;10,0;R")
    return "\n".join(filas).encode("utf-8")


def test_subir_factura_csv_exitoso(client):
    resp = client.post(
        "/simulador/factura/csv",
        files={"file": ("consumo.csv", _csv_anual_simple(), "text/csv")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["estado"] == "exitoso"
    assert body["consumo_anual_kwh"] > 0
    assert body["consumo_mensual_disponible"] is True
    assert body["cups_masked"].startswith("ES0022")


def test_subir_factura_csv_formato_no_reconocido(client):
    contenido = b"CUPS;Fecha;Periodo;PotenciaMaxima_kW\nES123;01/01/2024;P1;4,6\n"
    resp = client.post(
        "/simulador/factura/csv",
        files={"file": ("potencias.csv", contenido, "text/csv")},
    )
    assert resp.status_code == 200  # el endpoint no lanza 4xx: guarda el estado "no_extraido"
    body = resp.json()
    assert body["estado"] == "no_extraido"
    assert body["error"] is not None


def test_subir_factura_csv_rate_limit(client):
    for _ in range(10):
        resp = client.post(
            "/simulador/factura/csv",
            files={"file": ("consumo.csv", _csv_anual_simple(), "text/csv")},
        )
        assert resp.status_code == 200
    resp = client.post(
        "/simulador/factura/csv",
        files={"file": ("consumo.csv", _csv_anual_simple(), "text/csv")},
    )
    assert resp.status_code == 429
