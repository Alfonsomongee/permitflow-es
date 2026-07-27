import json
import glob
import os

def update_gas(data):
    # Validations adjustment
    for val in data.get('validaciones', []):
        if val.get('id') == 'MAD-GAS-VALIDACION-AMPLIACION':
            val['campos_requeridos'] = [
                "incremento_potencia_pct",
                "potencia_resultante_kw",
                "presion_resultante_bar"
            ]
            break
            
    # Rules adjustment
    for rule in data.get('reglas', []):
        if rule.get('id') == 'MAD-GAS-001':
            rule['condicion']['and'][1]['not']['or'][3]['and'][1] = {
                "or": [
                    { ">": [ { "var": "incremento_potencia_pct" }, 30 ] },
                    { ">": [ { "var": "presion_resultante_bar" }, 5 ] },
                    {
                        "and": [
                            { "==": [ { "var": "clase_instalacion_gas" }, "individual" ] },
                            { ">": [ { "var": "potencia_resultante_kw" }, 70 ] }
                        ]
                    },
                    {
                        "and": [
                            { "in": [ { "var": "clase_instalacion_gas" }, ["comun", "acometida_interior"] ] },
                            { ">": [ { "var": "potencia_resultante_kw" }, 2000 ] }
                        ]
                    }
                ]
            }
        elif rule.get('id') == 'MAD-GAS-002':
            rule['condicion']['and'][1]['or'][3]['and'][1] = {
                "or": [
                    { ">": [ { "var": "incremento_potencia_pct" }, 30 ] },
                    { ">": [ { "var": "presion_resultante_bar" }, 5 ] },
                    {
                        "and": [
                            { "==": [ { "var": "clase_instalacion_gas" }, "individual" ] },
                            { ">": [ { "var": "potencia_resultante_kw" }, 70 ] }
                        ]
                    },
                    {
                        "and": [
                            { "in": [ { "var": "clase_instalacion_gas" }, ["comun", "acometida_interior"] ] },
                            { ">": [ { "var": "potencia_resultante_kw" }, 2000 ] }
                        ]
                    }
                ]
            }

def update_irve(data):
    # Rule 001 - Documentos - Acta XI
    for rule in data.get('reglas', []):
        for tramite in rule.get('tramites', []):
            for doc in tramite.get('documentos_requeridos', []):
                if doc.get('id') == 'anexo_acta_xi':
                    doc['condicion_documento'] = {
                        "==": [ { "var": "instalacion_origen_modificada" }, False ]
                    }
                    break
        if rule.get('id') == 'MAD-IRVE-002':
            for tramite in rule.get('tramites', []):
                if tramite.get('orden') == 1:
                    tramite['nombre'] = "Proyecto técnico, visado cuando proceda o acompañado de declaración responsable"

def update_fv(data):
    # Validations adjustment
    for val in data.get('validaciones', []):
        if val.get('id') == 'MAD-FV-VALIDACION-REGISTRO':
            val['campos_requeridos'] = [
                "potencia_kw",
                "nivel_tension_consumidor",
                "nivel_tension_generacion",
                "nivel_tension_conexion"
            ]
            break
            
    # Rules adjustment
    for rule in data.get('reglas', []):
        if rule.get('id') == 'MAD-FV-REGISTRO-OFICIO':
            rule['condicion']['and'] = [
                { "==": [ { "var": "tipo_instalacion" }, "fotovoltaica_autoconsumo" ] },
                { "<": [ { "var": "potencia_kw" }, 100 ] },
                { "==": [ { "var": "nivel_tension_consumidor" }, "bt" ] },
                { "==": [ { "var": "nivel_tension_generacion" }, "bt" ] },
                { "==": [ { "var": "nivel_tension_conexion" }, "bt" ] }
            ]
        elif rule.get('id') == 'MAD-FV-REGISTRO-SOLICITUD':
            rule['condicion']['and'][1]['not']['and'] = [
                { "<": [ { "var": "potencia_kw" }, 100 ] },
                { "==": [ { "var": "nivel_tension_consumidor" }, "bt" ] },
                { "==": [ { "var": "nivel_tension_generacion" }, "bt" ] },
                { "==": [ { "var": "nivel_tension_conexion" }, "bt" ] }
            ]
            for tramite in rule.get('tramites', []):
                if tramite.get('orden') == 2:
                    tramite['formulario_ref'] = None
                    tramite['referencia_tramite'] = "D50"
                    tramite['plazo_estimado_dias'] = None
        elif rule.get('id') == 'MAD-FV-AT-AUTORIZACION':
            for tramite in rule.get('tramites', []):
                if tramite.get('orden') == 1:
                    tramite['plazo_estimado_dias'] = None
        elif rule.get('id') == 'MAD-FV-BT-PUESTA-SERVICIO':
            rule['condicion']['and'][1] = { "==": [ { "var": "nivel_tension_conexion" }, "bt" ] }
        elif rule.get('id') == 'MAD-FV-AT-AUTORIZACION':
            rule['condicion']['and'][1] = { "==": [ { "var": "nivel_tension_conexion" }, "at" ] }

def update_acs(data):
    for rule in data.get('reglas', []):
        if rule.get('id') == 'MAD-ACS-002':
            rule['condicion']['and'][1] = {
                "==": [ { "var": "incluida_ambito_rd_487_2022" }, True ]
            }


for f in glob.glob('apps/api/motor_normativo/reglas/madrid/*.json'):
    with open(f, 'r', encoding='utf-8') as file:
        data = json.load(file)
        
    tipo = data.get('tipo_instalacion')
    if tipo == 'gas_baja_presion':
        update_gas(data)
    elif tipo == 'irve':
        update_irve(data)
    elif tipo == 'fotovoltaica_autoconsumo':
        update_fv(data)
    elif tipo == 'acs':
        update_acs(data)
        
    with open(f, 'w', encoding='utf-8') as file:
        json.dump(data, file, ensure_ascii=False, indent=2)

md = '# JSONs Revisados - Comunidad de Madrid\n\n'
files = glob.glob('apps/api/motor_normativo/reglas/madrid/*.json')
files.sort()
for f in files:
    with open(f, encoding='utf-8') as file:
        md += f'## {os.path.basename(f)}\n```json\n{file.read()}\n```\n\n'
        
out_path = r'C:\Users\aphmo\.gemini\antigravity\brain\6640978a-d78d-47ab-9e18-59864716f668\madrid_revisados.md'
with open(out_path, 'w', encoding='utf-8') as out:
    out.write(md)

print("Updates applied successfully!")
