import pytest
import json
from json_logic import jsonLogic
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../apps/api')))

from schemas.clasificador import ClasificadorInput
from motor_normativo.clasificador import Clasificador
from pydantic import ValidationError

def load_cataluna_rules(filename):
    path = os.path.join(os.path.dirname(__file__), '../../apps/api/motor_normativo/reglas/cataluna', filename)
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

# Helper to validate JSONLogic node
def validate_no_empty_keys(node, path=""):
    if isinstance(node, dict):
        if "" in node:
            raise ValueError(f"Found empty key operator '' at path {path}")
        for k, v in node.items():
            validate_no_empty_keys(v, path + f"/{k}")
    elif isinstance(node, list):
        for i, item in enumerate(node):
            validate_no_empty_keys(item, path + f"[{i}]")

# 1. Integrity check
def test_cataluna_jsonlogic_integrity():
    files = [
        'gas_baja_presion.json',
        'irve.json',
        'fotovoltaica_autoconsumo.json',
        'acs.json',
        'climatizacion_aerotermia.json'
    ]
    for filename in files:
        data = load_cataluna_rules(filename)
        for rule in data.get('reglas', []):
            validate_no_empty_keys(rule.get('condicion', {}))
            for tramite in rule.get('tramites', []):
                for doc in tramite.get('documentos_requeridos', []):
                    if 'condicion_documento' in doc:
                        validate_no_empty_keys(doc['condicion_documento'])

# 2. ACS test
def test_cataluna_acs_rules():
    data = load_cataluna_rules('acs.json')
    r_no_rite = data['reglas'][0]['condicion']
    r_mtd = data['reglas'][1]['condicion']
    r_proy = data['reglas'][2]['condicion']
    r_legio = data['reglas'][3]['condicion']

    base_context = {"tipo_instalacion": "acs", "incluida_ambito_legionella": False}

    # < 5 kW
    ctx_4kw = {**base_context, "potencia_kw": 4.9}
    assert jsonLogic(r_no_rite, ctx_4kw) is True
    assert jsonLogic(r_mtd, ctx_4kw) is False
    assert jsonLogic(r_proy, ctx_4kw) is False

    # 5 kW
    ctx_5kw = {**base_context, "potencia_kw": 5.0}
    assert jsonLogic(r_no_rite, ctx_5kw) is False
    assert jsonLogic(r_mtd, ctx_5kw) is True
    assert jsonLogic(r_proy, ctx_5kw) is False

    # 69.9 kW
    ctx_69kw = {**base_context, "potencia_kw": 69.9}
    assert jsonLogic(r_no_rite, ctx_69kw) is False
    assert jsonLogic(r_mtd, ctx_69kw) is True
    assert jsonLogic(r_proy, ctx_69kw) is False

    # 70 kW
    ctx_70kw = {**base_context, "potencia_kw": 70.0}
    assert jsonLogic(r_no_rite, ctx_70kw) is False
    assert jsonLogic(r_mtd, ctx_70kw) is False
    assert jsonLogic(r_proy, ctx_70kw) is True

    # Legionella
    assert jsonLogic(r_legio, {**base_context, "incluida_ambito_legionella": True}) is True
    assert jsonLogic(r_legio, {**base_context, "incluida_ambito_legionella": False}) is False

# 3. Climatización / Aerotermia test
def test_cataluna_aerotermia_rules():
    data = load_cataluna_rules('climatizacion_aerotermia.json')
    r_no_rite = data['reglas'][0]['condicion']
    r_mtd = data['reglas'][1]['condicion']
    r_proy = data['reglas'][2]['condicion']

    base_context = {"tipo_instalacion": "climatizacion_aerotermia"}

    # < 5 kW
    ctx_4kw = {**base_context, "potencia_kw": 4}
    assert jsonLogic(r_no_rite, ctx_4kw) is True
    assert jsonLogic(r_mtd, ctx_4kw) is False

    # 5 kW
    ctx_5kw = {**base_context, "potencia_kw": 5}
    assert jsonLogic(r_no_rite, ctx_5kw) is False
    assert jsonLogic(r_mtd, ctx_5kw) is True
    assert jsonLogic(r_proy, ctx_5kw) is False

    # 70 kW
    ctx_70kw = {**base_context, "potencia_kw": 70}
    assert jsonLogic(r_no_rite, ctx_70kw) is False
    assert jsonLogic(r_mtd, ctx_70kw) is False
    assert jsonLogic(r_proy, ctx_70kw) is True

# 4. Gas Baja Presión test
def test_cataluna_gas_rules():
    data = load_cataluna_rules('gas_baja_presion.json')
    r_proy = data['reglas'][0]['condicion']
    r_mtd = data['reglas'][1]['condicion']

    base_context = {
        "tipo_instalacion": "gas_baja_presion",
        "clase_instalacion_gas": "individual",
        "presion_resultante_bar": 0.1,
        "potencia_resultante_kw": 50,
        "es_ampliacion": False,
        "incremento_potencia_pct": 0
    }

    # MTD (individual, <=70kW, <=5bar, no amp)
    assert jsonLogic(r_proy, base_context) is False
    assert jsonLogic(r_mtd, base_context) is True

    # Proyecto (presion > 5 bar)
    ctx_p5 = {**base_context, "presion_resultante_bar": 5.1}
    assert jsonLogic(r_proy, ctx_p5) is True
    assert jsonLogic(r_mtd, ctx_p5) is False

    # Proyecto (individual, >70kW)
    ctx_p70 = {**base_context, "potencia_resultante_kw": 70.1}
    assert jsonLogic(r_proy, ctx_p70) is True
    assert jsonLogic(r_mtd, ctx_p70) is False

    # MTD (comun, <=2000kW)
    ctx_comun = {**base_context, "clase_instalacion_gas": "comun", "potencia_resultante_kw": 2000}
    assert jsonLogic(r_proy, ctx_comun) is False
    assert jsonLogic(r_mtd, ctx_comun) is True

    # Proyecto (comun, >2000kW)
    ctx_comun_p = {**base_context, "clase_instalacion_gas": "comun", "potencia_resultante_kw": 2000.1}
    assert jsonLogic(r_proy, ctx_comun_p) is True
    assert jsonLogic(r_mtd, ctx_comun_p) is False

    # Proyecto (conexion_servicio, >2000kW)
    ctx_conex_p = {**base_context, "clase_instalacion_gas": "conexion_servicio", "potencia_resultante_kw": 2001}
    assert jsonLogic(r_proy, ctx_conex_p) is True
    assert jsonLogic(r_mtd, ctx_conex_p) is False

    # Proyecto (ampliacion >30%)
    ctx_amp = {**base_context, "es_ampliacion": True, "incremento_potencia_pct": 31}
    assert jsonLogic(r_proy, ctx_amp) is True
    assert jsonLogic(r_mtd, ctx_amp) is False

    # MTD (ampliacion <=30%)
    ctx_amp_mtd = {**base_context, "es_ampliacion": True, "incremento_potencia_pct": 30}
    assert jsonLogic(r_proy, ctx_amp_mtd) is False
    assert jsonLogic(r_mtd, ctx_amp_mtd) is True

# 5. IRVE test
def test_cataluna_irve_rules():
    data = load_cataluna_rules('irve.json')
    r_mtd = data['reglas'][0]['condicion']
    r_proy = data['reglas'][1]['condicion']

    base_context = {
        "tipo_instalacion": "irve",
        "potencia_kw": 22,
        "modo_recarga": "3",
        "ubicacion_irve": "interior",
        "uso_edificio": "residencial",
        "ventilacion_garaje": "natural",
        "numero_plazas_garaje": 3,
        "garaje_existente": True
    }

    # MTD base
    assert jsonLogic(r_mtd, base_context) is True
    assert jsonLogic(r_proy, base_context) is False

    # Proyecto (modo 4)
    ctx_m4 = {**base_context, "modo_recarga": "4"}
    assert jsonLogic(r_mtd, ctx_m4) is False
    assert jsonLogic(r_proy, ctx_m4) is True

    # Proyecto (potencia > 50 kW)
    ctx_p51 = {**base_context, "potencia_kw": 51}
    assert jsonLogic(r_mtd, ctx_p51) is False
    assert jsonLogic(r_proy, ctx_p51) is True

    # Proyecto (exterior y > 10 kW)
    ctx_ext = {**base_context, "ubicacion_irve": "exterior", "potencia_kw": 11}
    assert jsonLogic(r_mtd, ctx_ext) is False
    assert jsonLogic(r_proy, ctx_ext) is True

    # MTD (exterior y <= 10 kW)
    ctx_ext_mtd = {**base_context, "ubicacion_irve": "exterior", "potencia_kw": 10}
    assert jsonLogic(r_mtd, ctx_ext_mtd) is True
    assert jsonLogic(r_proy, ctx_ext_mtd) is False

    # Proyecto garaje (no_residencial, forzada)
    ctx_g_forzada = {
        **base_context,
        "ubicacion_irve": "garaje_comunitario",
        "uso_edificio": "no_residencial",
        "ventilacion_garaje": "forzada"
    }
    assert jsonLogic(r_mtd, ctx_g_forzada) is False
    assert jsonLogic(r_proy, ctx_g_forzada) is True

    # Proyecto garaje (no_residencial, natural, plazas > 5)
    ctx_g_natural_p6 = {
        **base_context,
        "ubicacion_irve": "garaje_comunitario",
        "uso_edificio": "no_residencial",
        "ventilacion_garaje": "natural",
        "numero_plazas_garaje": 6
    }
    assert jsonLogic(r_mtd, ctx_g_natural_p6) is False
    assert jsonLogic(r_proy, ctx_g_natural_p6) is True

    # MTD garaje (no_residencial, natural, plazas <= 5)
    ctx_g_natural_p5 = {
        **base_context,
        "ubicacion_irve": "garaje_comunitario",
        "uso_edificio": "no_residencial",
        "ventilacion_garaje": "natural",
        "numero_plazas_garaje": 5
    }
    assert jsonLogic(r_mtd, ctx_g_natural_p5) is True
    assert jsonLogic(r_proy, ctx_g_natural_p5) is False

    # MTD garaje (residencial, forzada)
    ctx_g_res = {
        **base_context,
        "ubicacion_irve": "garaje_comunitario",
        "uso_edificio": "residencial",
        "ventilacion_garaje": "forzada"
    }
    assert jsonLogic(r_mtd, ctx_g_res) is True
    assert jsonLogic(r_proy, ctx_g_res) is False

# 6. Fotovoltaica test
def test_cataluna_fotovoltaica_rules():
    data = load_cataluna_rules('fotovoltaica_autoconsumo.json')
    r_acceso = data['reglas'][0]['condicion']
    r_auto = data['reglas'][1]['condicion']
    r_obra_com = data['reglas'][2]['condicion']
    r_obra_lic = data['reglas'][3]['condicion']
    r_bt = data['reglas'][4]['condicion']
    r_at = data['reglas'][5]['condicion']
    r_rac_simpl = data['reglas'][6]['condicion']
    r_rac_est = data['reglas'][7]['condicion']

    base_context = {
        "tipo_instalacion": "fotovoltaica_autoconsumo",
        "potencia_kw": 50,
        "modalidad_autoconsumo": "con_excedentes_con_compensacion",
        "ubicacion_suelo": "urbanizado",
        "requiere_acceso_conexion": False,
        "tension": "BT"
    }

    # Acceso
    assert jsonLogic(r_acceso, {**base_context, "requiere_acceso_conexion": True}) is True
    assert jsonLogic(r_acceso, {**base_context, "requiere_acceso_conexion": False}) is False

    # Autorizaciones (exento <= 500, requiere > 500)
    assert jsonLogic(r_auto, {**base_context, "potencia_kw": 500}) is False
    assert jsonLogic(r_auto, {**base_context, "potencia_kw": 500.1}) is True

    # Obras
    # Urbanizado siempre comunicación
    assert jsonLogic(r_obra_com, {**base_context, "ubicacion_suelo": "urbanizado", "potencia_kw": 1000}) is True
    assert jsonLogic(r_obra_lic, {**base_context, "ubicacion_suelo": "urbanizado", "potencia_kw": 1000}) is False
    # No urbanizable <= 100 kW comunicación
    assert jsonLogic(r_obra_com, {**base_context, "ubicacion_suelo": "no_urbanizable", "potencia_kw": 100}) is True
    assert jsonLogic(r_obra_lic, {**base_context, "ubicacion_suelo": "no_urbanizable", "potencia_kw": 100}) is False
    # No urbanizable > 100 kW licencia
    assert jsonLogic(r_obra_com, {**base_context, "ubicacion_suelo": "no_urbanizable", "potencia_kw": 100.1}) is False
    assert jsonLogic(r_obra_lic, {**base_context, "ubicacion_suelo": "no_urbanizable", "potencia_kw": 100.1}) is True

    # Tension (BT vs AT)
    assert jsonLogic(r_bt, {**base_context, "tension": "BT"}) is True
    assert jsonLogic(r_at, {**base_context, "tension": "BT"}) is False
    assert jsonLogic(r_bt, {**base_context, "tension": "AT"}) is False
    assert jsonLogic(r_at, {**base_context, "tension": "AT"}) is True

    # RAC Simplificado (con_compensacion y <= 100)
    assert jsonLogic(r_rac_simpl, {**base_context, "modalidad_autoconsumo": "con_excedentes_con_compensacion", "potencia_kw": 100}) is True
    assert jsonLogic(r_rac_est, {**base_context, "modalidad_autoconsumo": "con_excedentes_con_compensacion", "potencia_kw": 100}) is False

    # RAC Estandar (> 100 kW)
    assert jsonLogic(r_rac_simpl, {**base_context, "modalidad_autoconsumo": "con_excedentes_con_compensacion", "potencia_kw": 101}) is False
    assert jsonLogic(r_rac_est, {**base_context, "modalidad_autoconsumo": "con_excedentes_con_compensacion", "potencia_kw": 101}) is True

    # RAC Estandar (sin_compensacion)
    assert jsonLogic(r_rac_simpl, {**base_context, "modalidad_autoconsumo": "con_excedentes_sin_compensacion", "potencia_kw": 50}) is False
    assert jsonLogic(r_rac_est, {**base_context, "modalidad_autoconsumo": "con_excedentes_sin_compensacion", "potencia_kw": 50}) is True

# 7. Classification and validation integration test
def test_cataluna_classifier_integration():
    c = Clasificador()

    # Valid validation for Gas
    params_gas = ClasificadorInput(
        tipo_instalacion="gas_baja_presion",
        comunidad="cataluna",
        potencia_kw=50,
        uso="industrial",
        clase_instalacion_gas="individual",
        presion_resultante_bar=0.1,
        potencia_resultante_kw=50,
        es_ampliacion=False
    )
    res = c.clasificar(params_gas)
    assert len(res.tramites) > 0
    assert any(t.regla_id == "CAT-GBP-002" for t in res.tramites)

    # Missing fields for Cataluña Gas raises ValidationError (via API schemas validator)
    with pytest.raises(ValidationError):
        ClasificadorInput(
            tipo_instalacion="gas_baja_presion",
            comunidad="cataluna",
            potencia_kw=50,
            uso="industrial"
            # Missing clase_instalacion_gas, presion_resultante_bar, potencia_resultante_kw
        )

    # Missing fields for Cataluña IRVE in garaje raises ValidationError
    with pytest.raises(ValidationError):
        ClasificadorInput(
            tipo_instalacion="irve",
            comunidad="cataluna",
            potencia_kw=22,
            uso="residencial",
            ubicacion_irve="garaje_comunitario"
            # Missing uso_edificio, ventilacion_garaje, numero_plazas_garaje, garaje_existente
        )

    # Valid IRVE garaje
    params_irve = ClasificadorInput(
        tipo_instalacion="irve",
        comunidad="cataluna",
        potencia_kw=22,
        uso="residencial",
        ubicacion_irve="garaje_comunitario",
        uso_edificio="no_residencial",
        ventilacion_garaje="natural",
        numero_plazas_garaje=6,
        garaje_existente=True,
        modo_recarga="3"
    )
    res_irve = c.clasificar(params_irve)
    assert any(t.regla_id == "CAT-IRVE-002" for t in res_irve.tramites)
