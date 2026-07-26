import sys
import os

from motor_normativo.clasificador import Clasificador
from schemas.clasificador import ClasificadorInput
from documentos.schemas import ExpedienteDoc, OrganizacionDoc, GenerarDocumentoInput
from documentos.pdf import generar_plan_pdf, generar_checklist_pdf

def test_climatizacion_pdf():
    print("--- TEST PDF CLIMATIZACIÓN ---")
    clasificador = Clasificador()
    params = {
        "tipo_instalacion": "climatizacion_aerotermia",
        "comunidad": "andalucia",
        "municipio": "Sevilla",
        "potencia_kw": 15,
        "uso": "residencial",
    }
    
    plan = clasificador.clasificar(ClasificadorInput(**params))
    org = OrganizacionDoc(nombre="Test Org")
    exp = ExpedienteDoc(
        id="exp_1", 
        tipo_instalacion="climatizacion_aerotermia",
        comunidad="andalucia",
        municipio="Sevilla",
        potencia_kw=15,
        uso="residencial"
    )
    payload_plan = GenerarDocumentoInput(
        tipo="plan",
        organizacion=org,
        expediente=exp,
        plan=plan
    )
    pdf_plan = generar_plan_pdf(payload_plan)
    print(f"PDF Plan generado correctamente. Tamaño: {len(pdf_plan)} bytes")

    payload_check = GenerarDocumentoInput(
        tipo="checklist",
        organizacion=org,
        expediente=exp,
        plan=plan
    )
    pdf_check = generar_checklist_pdf(payload_check)
    print(f"PDF Checklist generado correctamente. Tamaño: {len(pdf_check)} bytes")

def test_acs_fusion():
    print("\n--- TEST ACS FUSION REGLAS (AND-ACS-002 + AND-ACS-003) ---")
    clasificador = Clasificador()
    params = {
        "tipo_instalacion": "acs",
        "comunidad": "andalucia",
        "municipio": "Sevilla",
        "potencia_kw": 80,
        "uso": "terciario",
    }
    plan = clasificador.clasificar(ClasificadorInput(**params))
    print("Trámites (en orden resultante):")
    for t in plan.tramites:
        print(f"[{t.orden}] {t.nombre} (Regla: {t.regla_id}, Paralelo con: {t.paralelo_con})")
        for doc in t.documentos_requeridos:
            print(f"    - Doc: {doc.label}")
            
    # Generate PDF Checklist to ensure no duplicates/omissions crash the generator
    org = OrganizacionDoc(nombre="Test Org")
    exp = ExpedienteDoc(
        id="exp_2", 
        tipo_instalacion="acs",
        comunidad="andalucia",
        municipio="Sevilla",
        potencia_kw=80,
        uso="terciario"
    )
    payload_check = GenerarDocumentoInput(
        tipo="checklist",
        organizacion=org,
        expediente=exp,
        plan=plan
    )
    pdf_check = generar_checklist_pdf(payload_check)
    print(f"PDF Checklist generado correctamente para ACS. Tamaño: {len(pdf_check)} bytes")

if __name__ == '__main__':
    test_climatizacion_pdf()
    test_acs_fusion()
