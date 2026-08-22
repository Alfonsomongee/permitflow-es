from fastapi.testclient import TestClient

from documentos.pdf import generar_informe_viabilidad_pdf
from documentos.schemas import GenerarInformeViabilidadInput
from main import app


def _idoneidad(**overrides):
    base = {
        "ubicacion": {
            "lat": 37.38,
            "lon": -5.99,
            "comunidad": "andalucia",
            "zona_climatica_cte": "B4",
            "zona_climatica_origen": "capital_de_provincia",
            "zona_climatica_aproximada": False,
        },
        "idoneidad": {
            "fotovoltaica_autoconsumo": {
                "disponible": True,
                "produccion_especifica_kwh_kwp_year": 1650.4,
                "radiacion_anual_kwh_m2": 1900.2,
                "banda": "excelente",
                "produccion_mensual_kwh": [100.0] * 12,
                "desviacion_estandar_mensual": [5.0] * 12,
            },
            "climatizacion_aerotermia": {
                "disponible": True,
                "zona_climatica": "B4",
                "banda": "moderada",
                "descripcion_zona": "Zona de inviernos suaves.",
                "temperatura_media_mensual": [15.0] * 12,
                "topologia_equipo": None,
            },
        },
    }
    base.update(overrides)
    return base


def _payload(tecnologia_id="fotovoltaica_autoconsumo", marca_permitflow=False, **overrides):
    data = {
        "organizacion": {"nombre": "Instaladora Solar SL", "plan": "pro", "marca_permitflow": marca_permitflow},
        "tecnologia_id": tecnologia_id,
        "municipio": "Sevilla",
        "provincia": "Sevilla",
        "referencia_cliente": "Chalet Feria 12",
        "idoneidad": _idoneidad(),
    }
    data.update(overrides)
    return GenerarInformeViabilidadInput(**data)


def test_genera_pdf_fotovoltaica_valido():
    contenido = generar_informe_viabilidad_pdf(_payload())
    assert contenido.startswith(b"%PDF")
    assert len(contenido) > 500


def test_genera_pdf_aerotermia_valido():
    contenido = generar_informe_viabilidad_pdf(_payload(tecnologia_id="climatizacion_aerotermia"))
    assert contenido.startswith(b"%PDF")


def test_genera_pdf_sin_indice_cuantitativo_para_irve():
    # IRVE no tiene banda de idoneidad calculada: no debe romper, solo omitir la sección.
    contenido = generar_informe_viabilidad_pdf(_payload(tecnologia_id="irve"))
    assert contenido.startswith(b"%PDF")


def test_genera_pdf_cuando_pvgis_no_disponible():
    idx = _idoneidad()
    idx["idoneidad"]["fotovoltaica_autoconsumo"]["disponible"] = False
    contenido = generar_informe_viabilidad_pdf(_payload(idoneidad=idx))
    assert contenido.startswith(b"%PDF")


def test_endpoint_informe_viabilidad_devuelve_pdf():
    client = TestClient(app)
    payload = _payload().model_dump()
    res = client.post(
        "/api/v1/documentos/informe-viabilidad",
        json=payload,
        headers={"X-Internal-Key": "ci-test-internal"},
    )
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert "PermitFlow_Informe_Viabilidad_Sevilla.pdf" in res.headers["content-disposition"]
    assert res.content.startswith(b"%PDF")
