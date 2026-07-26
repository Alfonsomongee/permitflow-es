import json
from pathlib import Path

def fix_region(region):
    p = Path(f"motor_normativo/reglas/{region}/fotovoltaica_autoconsumo.json")
    if not p.exists():
        return
    with p.open(encoding="utf-8") as f:
        data = json.load(f)
        
    for r in data.get('reglas', []):
        if r['id'].endswith("-FV-001"):
            # Ensure it is purely <= 10 or <= 15 without uso
            conds = r['condicion'].get('and', [])
            new_conds = []
            has_leq = False
            for c in conds:
                if '==' in c and c['=='][0].get('var') == 'uso':
                    continue
                if '<=' in c or '<' in c:
                    has_leq = True
                new_conds.append(c)
            if has_leq:
                if len(new_conds) == 1:
                    r['condicion'] = new_conds[0]
                else:
                    r['condicion'] = {"and": new_conds}
            
        elif r['id'].endswith("-FV-002"):
            # Purely > 10 and <= 100 (or whatever boundaries it had)
            conds = r.get('condicion', {}).get('and', [])
            new_conds = []
            for c in conds:
                if '==' in c and c['=='][0].get('var') == 'uso':
                    continue
                new_conds.append(c)
                
            # If my previous script completely removed the <= 100, I need to add it back!
            has_leq = any(k in c for c in new_conds for k in ('<=', '<'))
            if not has_leq:
                new_conds.append({"<=": [{"var": "potencia_kw"}, 100]})
                
            if len(new_conds) == 1:
                r['condicion'] = new_conds[0]
            else:
                r['condicion'] = {"and": new_conds}
                
        elif r['id'].endswith("-FV-003"):
            # Purely > 100 without uso
            r['condicion'] = {">": [{"var": "potencia_kw"}, 100]}
            
    with p.open('w', encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

def main():
    for region in ["cantabria", "extremadura", "la_rioja", "navarra"]:
        fix_region(region)

if __name__ == "__main__":
    main()
