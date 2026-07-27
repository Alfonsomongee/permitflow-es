import pytest
from pydantic import ValidationError
from servicios.informes_ia import InformeSimulacionIA, EscenarioAhorro, Incentivo

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
