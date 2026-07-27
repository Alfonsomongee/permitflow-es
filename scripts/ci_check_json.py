import json
import os
import sys

STANDARD_OPERATORS = {
    "==", "===", "!=", "!==", ">", ">=", "<", "<=", "!", "!!", 
    "or", "and", "var", "in", "cat", "map", "reduce", "filter", 
    "all", "none", "some", "merge", "substr", "+", "-", "*", "/", 
    "%", "min", "max", "if", "missing", "missing_some"
}

def check_logic_issues(node, path=""):
    errors = []
    unknown_ops = []
    
    if isinstance(node, dict):
        for k, v in node.items():
            if k == "":
                errors.append(f"Empty operator '' found at {path}")
            elif k == "not":
                errors.append(f"Invalid operator 'not' found at {path}. Use '!' instead.")
            elif k not in STANDARD_OPERATORS:
                unknown_ops.append(f"Unknown JSONLogic operator '{k}' found at {path}")
            
            sub_err, sub_unk = check_logic_issues(v, path + f"/{k}")
            errors.extend(sub_err)
            unknown_ops.extend(sub_unk)
            
    elif isinstance(node, list):
        for i, item in enumerate(node):
            sub_err, sub_unk = check_logic_issues(item, path + f"[{i}]")
            errors.extend(sub_err)
            unknown_ops.extend(sub_unk)
            
    return errors, unknown_ops

def main():
    rules_base_dir = os.path.normpath(os.path.join(os.path.dirname(__file__), '../apps/api/motor_normativo/reglas'))
    
    # Recursively find all JSON files
    json_files = []
    for root, dirs, files in os.walk(rules_base_dir):
        for f in files:
            if f.endswith('.json') and not f.startswith('_'):
                json_files.append(os.path.join(root, f))
                
    total_files = len(json_files)
    parse_errors = 0
    empty_operators = 0
    invalid_not_operators = 0
    duplicate_rule_ids = 0
    duplicate_document_ids = 0
    unknown_logic_operators = 0
    missing_regla_id_refs = 0
    generic_canal_empresa_urls = 0
    
    print("=== CI JSON Integrity Check ===")
    
    for filepath in json_files:
        filename = os.path.relpath(filepath, rules_base_dir)
        is_target_ca = "madrid" in filename or "cataluna" in filename
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            print(f"[FAIL] {filename} - JSON Parse Error: {str(e)}")
            if is_target_ca:
                parse_errors += 1
            continue
            
        file_errors = []
        rule_ids_seen = set()
        rule_ids_in_file = set()
        
        # Primero recolectamos todos los IDs de regla válidos en este archivo
        for rule in data.get('reglas', []):
            rule_id = rule.get('id')
            if rule_id:
                rule_ids_in_file.add(rule_id)
        
        for rule in data.get('reglas', []):
            rule_id = rule.get('id', 'unknown')
            if rule_id in rule_ids_seen:
                file_errors.append(f"Duplicate Rule ID found: {rule_id}")
                if is_target_ca:
                    duplicate_rule_ids += 1
            rule_ids_seen.add(rule_id)
            
            # Validar operador vacío y operadores desconocidos en condición de regla
            errs, unks = check_logic_issues(rule.get('condicion', {}), path=f"Rule {rule_id} -> condicion")
            file_errors.extend(errs)
            for unk in unks:
                file_errors.append(unk)
                if is_target_ca:
                    unknown_logic_operators += 1
            
            for tramite in rule.get('tramites', []):
                # Comprobación de regla_id faltante o incorrecta
                t_regla_id = tramite.get('regla_id')
                if t_regla_id and t_regla_id not in rule_ids_in_file:
                    file_errors.append(f"Missing/Invalid regla_id reference '{t_regla_id}' in procedure '{tramite.get('nombre')}'")
                    if is_target_ca:
                        missing_regla_id_refs += 1
                
                # Comprobación de URL genérica de Canal Empresa
                p_url = tramite.get('plataforma_url')
                if p_url and p_url.strip().rstrip('/') == "https://canalempresa.gencat.cat":
                    file_errors.append(f"Generic Canal Empresa URL found in procedure '{tramite.get('nombre')}'")
                    if is_target_ca:
                        generic_canal_empresa_urls += 1
                
                # Comprobación de documentos duplicados dentro del MISMO trámite
                doc_ids_seen = set()
                for doc in tramite.get('documentos_requeridos', []):
                    doc_id = doc.get('id')
                    if doc_id:
                        if doc_id in doc_ids_seen:
                            file_errors.append(f"Duplicate Document ID found within same procedure: {doc_id} in rule {rule_id}, procedure '{tramite.get('nombre')}'")
                            if is_target_ca:
                                duplicate_document_ids += 1
                        doc_ids_seen.add(doc_id)
                        
                    if 'condicion_documento' in doc:
                        d_errs, d_unks = check_logic_issues(doc['condicion_documento'], path=f"Rule {rule_id} -> doc {doc.get('id', 'unknown')}")
                        file_errors.extend(d_errs)
                        for unk in d_unks:
                            file_errors.append(unk)
                            if is_target_ca:
                                unknown_logic_operators += 1
        
        if not file_errors:
            print(f"[OK] {filename}")
        else:
            status_prefix = "[FAIL]" if is_target_ca else "[WARN]"
            print(f"{status_prefix} {filename} has {len(file_errors)} issues:")
            for err in file_errors:
                print(f"  - {err}")
                if is_target_ca:
                    if "Empty operator" in err:
                        empty_operators += 1
                    if "Invalid operator 'not'" in err:
                        invalid_not_operators += 1

    print("\n=== Summary (Monitored CAs: Madrid & Cataluña) ===")
    print(f"Files checked: {total_files}")
    print(f"JSON Parse Errors: {parse_errors}")
    print(f"Empty Operators ('\\\"\\\"'): {empty_operators}")
    print(f"Invalid Operators ('not'): {invalid_not_operators}")
    print(f"Duplicate Rule IDs: {duplicate_rule_ids}")
    print(f"Duplicate Document IDs within same procedure: {duplicate_document_ids}")
    print(f"Unknown JSONLogic Operators: {unknown_logic_operators}")
    print(f"Missing regla_id references: {missing_regla_id_refs}")
    print(f"Generic Canal Empresa URLs: {generic_canal_empresa_urls}")
    
    if parse_errors > 0 or empty_operators > 0 or invalid_not_operators > 0 or duplicate_rule_ids > 0 or duplicate_document_ids > 0 or unknown_logic_operators > 0 or missing_regla_id_refs > 0 or generic_canal_empresa_urls > 0:
        sys.exit(1)
    sys.exit(0)

if __name__ == "__main__":
    main()
