import json
from pathlib import Path

def fix_fv_002(file_path):
    p = Path(file_path)
    if not p.exists():
        return
        
    with p.open(encoding="utf-8") as f:
        data = json.load(f)
        
    for r in data.get('reglas', []):
        if r['id'].endswith("-FV-002"):
            # The condition is:
            # "and": [ {">": 10}, {"<=": 100}, {"==": "residencial"} ]
            conds = r['condicion'].get('and', [])
            # Filter out the "<=" condition for potencia_kw
            new_conds = []
            for c in conds:
                is_leq_100 = False
                if "<=" in c:
                    args = c["<="]
                    if len(args) == 2 and isinstance(args[0], dict) and args[0].get("var") == "potencia_kw" and args[1] == 100:
                        is_leq_100 = True
                if not is_leq_100:
                    new_conds.append(c)
            r['condicion']['and'] = new_conds
            r['descripcion'] = r['descripcion'].replace(" y <= 100kW", "")
            
    with p.open('w', encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

def main():
    regions = ["cantabria", "extremadura", "la_rioja", "navarra"]
    for reg in regions:
        fix_fv_002(f"motor_normativo/reglas/{reg}/fotovoltaica_autoconsumo.json")

if __name__ == "__main__":
    main()
