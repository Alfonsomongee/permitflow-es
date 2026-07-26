import json
import copy
from pathlib import Path

def process_file(filepath):
    p = Path(filepath)
    with p.open(encoding="utf-8") as f:
        data = json.load(f)
        
    reglas = data.get("reglas", [])
    # Find duplicate IDs
    id_counts = {}
    for r in reglas:
        rid = r.get("id")
        if rid:
            id_counts[rid] = id_counts.get(rid, 0) + 1
            
    duplicates = {rid for rid, count in id_counts.items() if count > 1}
    
    if not duplicates:
        return
        
    added_defaults = set()
    new_reglas = []
    
    for r in reglas:
        rid = r.get("id")
        new_reglas.append(r)
        
        if rid in duplicates and rid not in added_defaults:
            # Create a default rule for this ID
            # Assuming condition is {"and": [base_cond, inversion_cond]}
            cond = r.get("condicion", {})
            if "and" in cond and len(cond["and"]) >= 2:
                base_cond = cond["and"][0]
            else:
                base_cond = cond
                
            def_rule = copy.deepcopy(r)
            def_rule["condicion"] = {
                "and": [
                    base_cond,
                    {"==": [{"var": "inversion_eur"}, None]}
                ]
            }
            def_rule["descripcion"] = r.get("descripcion", "") + " (Sin inversión informada)"
            
            for t in def_rule.get("tramites", []):
                if "coste_estimado" in t:
                    t["coste_estimado"] = "Depende de la inversión exacta"
                t["notas"] = (t.get("notas") or "") + "\nImporte exacto dependiente de la inversión. Introduzca la inversión para calcular las tasas."
                
            new_reglas.append(def_rule)
            added_defaults.add(rid)
            
    data["reglas"] = new_reglas
    with p.open('w', encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

def main():
    for filepath in Path("motor_normativo/reglas").rglob("*.json"):
        process_file(filepath)

if __name__ == "__main__":
    main()
