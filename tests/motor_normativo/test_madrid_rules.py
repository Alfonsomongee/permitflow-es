import pytest
import json
from json_logic import jsonLogic
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../apps/api')))
from schemas.clasificador import ClasificadorInput
from motor_normativo.clasificador import Clasificador
from pydantic import ValidationError

# Helper to load rules
def load_madrid_rules(filename):
    path = os.path.join(os.path.dirname(__file__), '../../apps/api/motor_normativo/reglas/madrid', filename)
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

# 1. Test de integridad general (JSONLogic limpio)
def validate_no_empty_keys(node, path=""):
    if isinstance(node, dict):
        if "" in node:
            raise ValueError(f"Found empty key operator '' at path {path}")
        for k, v in node.items():
            validate_no_empty_keys(v, path + f"/{k}")
    elif isinstance(node, list):
        for i, item in enumerate(node):
            validate_no_empty_keys(item, path + f"[{i}]")

def test_jsonlogic_integrity():
    files = [
        'gas_baja_presion.json',
        'irve.json',
        'fotovoltaica_autoconsumo.json',
        'acs.json',
        'climatizacion_aerotermia.json'
    ]
    for filename in files:
        data = load_madrid_rules(filename)
        for rule in data.get('reglas', []):
            validate_no_empty_keys(rule.get('condicion', {}))
            for tramite in rule.get('tramites', []):
                for doc in tramite.get('documentos_requeridos', []):
                    if 'condicion_documento' in doc:
                        validate_no_empty_keys(doc['condicion_documento'])

# 2. Exclusividad mutua Gas
def test_gas_mutual_exclusion():
    data = load_madrid_rules('gas_baja_presion.json')
    r1 = data['reglas'][0]['condicion']
    r2 = data['reglas'][1]['condicion']
    
    # Pruebas base
    t1 = {'tipo_instalacion': 'gas_baja_presion', 'clase_instalacion_gas': 'individual', 'potencia_resultante_kw': 70, 'presion_resultante_bar': 5, 'es_ampliacion': False, 'incremento_potencia_pct': 0}
    assert jsonLogic(r1, t1) == True
    assert jsonLogic(r2, t1) == False
    
    # 70.01 kW
    t2 = {**t1, 'potencia_resultante_kw': 70.01}
    assert jsonLogic(r1, t2) == False
    assert jsonLogic(r2, t2) == True
    
    # 5.01 bar
    t3 = {**t1, 'presion_resultante_bar': 5.01}
    assert jsonLogic(r1, t3) == False
    assert jsonLogic(r2, t3) == True
    
    # Comun 2000
    t4 = {**t1, 'clase_instalacion_gas': 'comun', 'potencia_resultante_kw': 2000}
    assert jsonLogic(r1, t4) == True
    assert jsonLogic(r2, t4) == False
    
    # Comun 2000.01
    t5 = {**t4, 'potencia_resultante_kw': 2000.01}
    assert jsonLogic(r1, t5) == False
    assert jsonLogic(r2, t5) == True
    
    # Ampliacion 30% exacta sin superar umbrales
    t6 = {**t1, 'es_ampliacion': True, 'incremento_potencia_pct': 30}
    assert jsonLogic(r1, t6) == True
    assert jsonLogic(r2, t6) == False
    
    # Ampliacion 30.01%
    t7 = {**t1, 'es_ampliacion': True, 'incremento_potencia_pct': 30.01}
    assert jsonLogic(r1, t7) == False
    assert jsonLogic(r2, t7) == True

# 3. Exclusividad mutua IRVE
def test_irve_mutual_exclusion():
    data = load_madrid_rules('irve.json')
    r1 = data['reglas'][0]['condicion']
    r2 = data['reglas'][1]['condicion']
    
    # Exterior 10kW Modo 3
    t1 = {'tipo_instalacion': 'irve', 'ubicacion_irve': 'exterior', 'potencia_kw': 10, 'modo_recarga': '3'}
    assert jsonLogic(r1, t1) == True
    assert jsonLogic(r2, t1) == False
    
    # Exterior 10.01kW Modo 3
    t2 = {**t1, 'potencia_kw': 10.01}
    assert jsonLogic(r1, t2) == False
    assert jsonLogic(r2, t2) == True
    
    # Interior 50kW Modo 3
    t3 = {'tipo_instalacion': 'irve', 'ubicacion_irve': 'interior', 'potencia_kw': 50, 'modo_recarga': '3'}
    assert jsonLogic(r1, t3) == True
    assert jsonLogic(r2, t3) == False
    
    # Interior 50.01kW Modo 3
    t4 = {**t3, 'potencia_kw': 50.01}
    assert jsonLogic(r1, t4) == False
    assert jsonLogic(r2, t4) == True
    
    # Modo 4 (Cualquier ubi/pot)
    t5 = {**t1, 'modo_recarga': '4', 'potencia_kw': 5}
    assert jsonLogic(r1, t5) == False
    assert jsonLogic(r2, t5) == True

# 4. Condicion_documento IRVE
def test_irve_document_conditions():
    data = load_madrid_rules('irve.json')
    
    # Extraer condiciones de los documentos de MAD-IRVE-001
    docs = data['reglas'][0]['tramites'][1]['documentos_requeridos']
    cond_acta_xi = next(d['condicion_documento'] for d in docs if d['id'] == 'anexo_acta_xi')
    cond_acta_xii = next(d['condicion_documento'] for d in docs if d['id'] == 'aclaraciones_acta_xii')
    
    # Instalacion origen no modificada -> Acta XI si
    assert jsonLogic(cond_acta_xi, {'instalacion_origen_modificada': False}) == True
    
    # Instalacion origen modificada -> Acta XI no
    assert jsonLogic(cond_acta_xi, {'instalacion_origen_modificada': True}) == False
    
    # Garaje comunitario con inspección -> Acta XII si
    assert jsonLogic(cond_acta_xii, {'ubicacion_irve': 'garaje_comunitario', 'garaje_sujeto_inspeccion_periodica': True}) == True
    
    # Interior no garaje -> Acta XII no
    assert jsonLogic(cond_acta_xii, {'ubicacion_irve': 'interior', 'garaje_sujeto_inspeccion_periodica': True}) == False

# 5. Exclusividad mutua FV y Registro Produccion
def test_fv_mutual_exclusion():
    data = load_madrid_rules('fotovoltaica_autoconsumo.json')
    r_oficio = data['reglas'][2]['condicion']
    r_solicitud = data['reglas'][3]['condicion']
    r_produccion = data['reglas'][4]['condicion']
    
    t_base = {'tipo_instalacion': 'fotovoltaica_autoconsumo', 'potencia_kw': 99.99, 'nivel_tension_consumidor': 'bt', 'nivel_tension_generacion': 'bt', 'nivel_tension_conexion': 'bt', 'requiere_registro_produccion': False}
    
    # Oficio
    assert jsonLogic(r_oficio, t_base) == True
    assert jsonLogic(r_solicitud, t_base) == False
    assert jsonLogic(r_produccion, t_base) == False
    
    # Solicitud por potencia
    t2 = {**t_base, 'potencia_kw': 100}
    assert jsonLogic(r_oficio, t2) == False
    assert jsonLogic(r_solicitud, t2) == True
    
    # Solicitud por tension at
    t3 = {**t_base, 'nivel_tension_generacion': 'at'}
    assert jsonLogic(r_oficio, t3) == False
    assert jsonLogic(r_solicitud, t3) == True
    
    # Produccion (coexiste)
    t4 = {**t_base, 'requiere_registro_produccion': True}
    assert jsonLogic(r_oficio, t4) == True
    assert jsonLogic(r_produccion, t4) == True
    
# 6. Campos Ausentes Fallback (Null handling)
def test_null_handling():
    data_gas = load_madrid_rules('gas_baja_presion.json')
    r_gas = data_gas['reglas'][0]['condicion']
    
    data_fv = load_madrid_rules('fotovoltaica_autoconsumo.json')
    r_fv = data_fv['reglas'][2]['condicion'] # Oficio
    
    # jsonLogic considers missing numeric fields as None, and None > 70 evaluates to False
    # Therefore, the 'not' wrapper (or '!') inverts it to True.
    # It evaluates to True but will be caught by the prior JSON schema validation 
    # and the logic rules "validaciones" before reaching jsonLogic in a real pipeline.
    assert jsonLogic(r_gas, {'tipo_instalacion': 'gas_baja_presion', 'clase_instalacion_gas': 'individual'}) == True
    
    # Falta tension en FV -> oficio evalua "bt" == None que es False
    assert jsonLogic(r_fv, {'tipo_instalacion': 'fotovoltaica_autoconsumo', 'potencia_kw': 90}) == False
    
def test_input_incompleto_no_se_clasifica():
    """
    Validation Test: Check that inputs missing required fields for decision-making 
    raise a Pydantic ValidationError before JSONLogic can improperly evaluate them.
    """
    entrada_incompleta = {
        "tipo_instalacion": "gas_baja_presion",
        "comunidad": "madrid",
        "clase_instalacion_gas": "individual",
        # Missing REQUIRED fields like potencia_kw, uso, etc.
    }
    
    with pytest.raises(ValidationError):
        # Initializing the Pydantic schema should fail
        ClasificadorInput(**entrada_incompleta)
