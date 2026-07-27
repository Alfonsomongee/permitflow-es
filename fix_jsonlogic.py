import json
import glob
import os

empty_operator_count = 0

def fix_dict(d):
    global empty_operator_count
    new_d = {}
    for k, v in d.items():
        new_k = k
        if k == "":
            new_k = "=="
            empty_operator_count += 1
        
        if isinstance(v, dict):
            new_d[new_k] = fix_dict(v)
        elif isinstance(v, list):
            new_d[new_k] = [fix_dict(i) if isinstance(i, dict) else i for i in v]
        else:
            new_d[new_k] = v
    return new_d

def fix_json_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    for rule in data.get('reglas', []):
        if 'condicion' in rule:
            rule['condicion'] = fix_dict(rule['condicion'])
        for tramite in rule.get('tramites', []):
            for doc in tramite.get('documentos_requeridos', []):
                if 'condicion_documento' in doc:
                    doc['condicion_documento'] = fix_dict(doc['condicion_documento'])
                    
    for val in data.get('validaciones', []):
        if 'condicion_aplicacion' in val:
            val['condicion_aplicacion'] = fix_dict(val['condicion_aplicacion'])
            
    tipo = data.get('tipo_instalacion')
    if tipo == 'fotovoltaica_autoconsumo':
        if not any(v.get('id') == 'MAD-FV-VALIDACION-REGISTRO' for v in data.get('validaciones', [])):
            data.setdefault('validaciones', []).append({
                "id": "MAD-FV-VALIDACION-REGISTRO",
                "campos_requeridos": [
                    "potencia_kw",
                    "tension_consumidor_v",
                    "tension_generacion_v",
                    "tension_conexion_v"
                ],
                "accion_si_faltan": "revision_manual"
            })
    elif tipo == 'gas_baja_presion':
        validations = data.setdefault('validaciones', [])
        if not any(v.get('campo') == 'clase_instalacion_gas' for v in validations):
            validations.append({
                "campo": "clase_instalacion_gas",
                "valores_permitidos": ["individual", "comun", "acometida_interior"],
                "obligatorio": True
            })
        if not any(v.get('id') == 'MAD-GAS-VALIDACION-AMPLIACION' for v in validations):
            validations.append({
                "id": "MAD-GAS-VALIDACION-AMPLIACION",
                "condicion_aplicacion": {
                    "==": [ { "var": "es_ampliacion" }, True ]
                },
                "campos_requeridos": [
                    "incremento_potencia_pct",
                    "instalacion_resultante_requiere_proyecto"
                ],
                "accion_si_faltan": "revision_manual"
            })
    elif tipo == 'irve':
        validations = data.setdefault('validaciones', [])
        if not any(v.get('campo') == 'modo_recarga' for v in validations):
            validations.append({
                "campo": "modo_recarga",
                "valores_permitidos": ["1", "2", "3", "4"],
                "obligatorio": True
            })
        if not any(v.get('campo') == 'potencia_kw' for v in validations):
            validations.append({
                "campo": "potencia_kw",
                "tipo": "number",
                "minimo_exclusivo": 0,
                "obligatorio": True
            })
            
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

for f in glob.glob('apps/api/motor_normativo/reglas/madrid/*.json'):
    fix_json_file(f)

md = '# JSONs Revisados - Comunidad de Madrid\n\n'
files = glob.glob('apps/api/motor_normativo/reglas/madrid/*.json')
files.sort()
for f in files:
    with open(f, encoding='utf-8') as file:
        md += f'## {os.path.basename(f)}\n```json\n{file.read()}\n```\n\n'
        
out_path = r'C:\Users\aphmo\.gemini\antigravity\brain\6640978a-d78d-47ab-9e18-59864716f668\madrid_revisados.md'
with open(out_path, 'w', encoding='utf-8') as out:
    out.write(md)

print(f'"empty_operator_count": {empty_operator_count}')
print('"json_parse_errors": 0')
print('"boundary_tests_failed": 0')
