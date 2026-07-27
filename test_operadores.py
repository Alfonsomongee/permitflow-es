import os
import glob
import re
import json

def fix_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace empty string operators in conditions with '=='
    # Only replace if it is purely an empty key operator `"":`
    new_content = re.sub(r'\"\"\s*:\s*\[', r'\"==\": [', content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Fixed {filepath}')
    else:
        print(f'No issues found in {filepath}')
        
def validate_no_empty_keys(node, path=""):
    if isinstance(node, dict):
        if "" in node:
            raise ValueError(f"Found empty key operator '' at path {path}")
        for k, v in node.items():
            validate_no_empty_keys(v, path + f"/{k}")
    elif isinstance(node, list):
        for i, item in enumerate(node):
            validate_no_empty_keys(item, path + f"[{i}]")

for f in glob.glob('apps/api/motor_normativo/reglas/madrid/*.json'):
    fix_json(f)
    
    # Validate
    with open(f, 'r', encoding='utf-8') as file:
        data = json.load(file)
        
    for rule in data.get('reglas', []):
        validate_no_empty_keys(rule.get('condicion', {}), path=f"regla {rule['id']} condicion")
        for tramite in rule.get('tramites', []):
            for doc in tramite.get('documentos_requeridos', []):
                if 'condicion_documento' in doc:
                    validate_no_empty_keys(doc['condicion_documento'], path=f"regla {rule['id']} doc {doc['id']}")
                    
print("All Madrid JSONs validated successfully!")
