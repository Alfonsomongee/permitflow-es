import json
import os
import sys

def check_empty_operators(node, path=""):
    errors = []
    if isinstance(node, dict):
        if "" in node:
            errors.append(f"Empty operator '' found at {path}")
        if "not" in node:
            errors.append(f"Invalid operator 'not' found at {path}. Use '!' instead.")
        for k, v in node.items():
            errors.extend(check_empty_operators(v, path + f"/{k}"))
    elif isinstance(node, list):
        for i, item in enumerate(node):
            errors.extend(check_empty_operators(item, path + f"[{i}]"))
    return errors

def main():
    rules_dir = os.path.join(os.path.dirname(__file__), '../apps/api/motor_normativo/reglas/madrid')
    files = [f for f in os.listdir(rules_dir) if f.endswith('.json') and not f.startswith('_')]
    
    total_files = len(files)
    parse_errors = 0
    empty_operators = 0
    invalid_not_operators = 0
    duplicate_rule_ids = 0
    duplicate_document_ids = 0
    
    print("=== CI JSON Integrity Check ===")
    
    for filename in files:
        filepath = os.path.join(rules_dir, filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            print(f"[FAIL] {filename} - JSON Parse Error: {str(e)}")
            parse_errors += 1
            continue
            
        file_errors = []
        rule_ids_seen = set()
        
        for rule in data.get('reglas', []):
            rule_id = rule.get('id', 'unknown')
            if rule_id in rule_ids_seen:
                file_errors.append(f"Duplicate Rule ID found: {rule_id}")
                duplicate_rule_ids += 1
            rule_ids_seen.add(rule_id)
            
            file_errors.extend(check_empty_operators(rule.get('condicion', {}), path=f"Rule {rule_id} -> condicion"))
            
            doc_ids_seen = set()
            for tramite in rule.get('tramites', []):
                for doc in tramite.get('documentos_requeridos', []):
                    doc_id = doc.get('id')
                    if doc_id:
                        if doc_id in doc_ids_seen:
                            file_errors.append(f"Duplicate Document ID found within same rule: {doc_id} in rule {rule_id}")
                            duplicate_document_ids += 1
                        doc_ids_seen.add(doc_id)
                        
                    if 'condicion_documento' in doc:
                        file_errors.extend(check_empty_operators(doc['condicion_documento'], path=f"Rule {rule_id} -> doc {doc.get('id', 'unknown')}"))
        
        if not file_errors:
            print(f"[OK] {filename}")
        else:
            print(f"[FAIL] {filename} has {len(file_errors)} issues:")
            for err in file_errors:
                print(f"  - {err}")
                if "Empty operator" in err:
                    empty_operators += 1
                if "Invalid operator 'not'" in err:
                    invalid_not_operators += 1

    print("\n=== Summary ===")
    print(f"Files checked: {total_files}")
    print(f"JSON Parse Errors: {parse_errors}")
    print(f"Empty Operators ('\\\"\\\"'): {empty_operators}")
    print(f"Invalid Operators ('not'): {invalid_not_operators}")
    print(f"Duplicate Rule IDs: {duplicate_rule_ids}")
    print(f"Duplicate Document IDs: {duplicate_document_ids}")
    
    if parse_errors > 0 or empty_operators > 0 or invalid_not_operators > 0 or duplicate_rule_ids > 0 or duplicate_document_ids > 0:
        sys.exit(1)
    sys.exit(0)

if __name__ == "__main__":
    main()
