import json
from pathlib import Path
import copy

def get_fee(kw):
    if kw <= 2: return "78.57 EUR"
    if kw <= 5: return "94.25 EUR"
    if kw <= 10: return "117.85 EUR"
    if kw <= 20: return "133.57 EUR"
    if kw <= 40: return "157.14 EUR"
    return "157.14 EUR + 7.86 EUR por cada 10 kW adicionales"

def make_rule(base_rule, id_suffix, cond_min, cond_max, fee_kw, name_suffix=""):
    r = copy.deepcopy(base_rule)
    r["id"] = r["id"] + id_suffix
    r["descripcion"] = r["descripcion"] + name_suffix
    conds = []
    if cond_min is not None:
        conds.append({">": [{"var": "potencia_kw"}, cond_min]})
    if cond_max is not None:
        conds.append({"<=": [{"var": "potencia_kw"}, cond_max]})
        
    if len(conds) == 1:
        r["condicion"] = conds[0]
    else:
        r["condicion"] = {"and": conds}
        
    # set fee
    for t in r["tramites"]:
        if "CIP 5625" in t["nombre"]:
            t["coste_estimado"] = get_fee(fee_kw)
    return r

def main():
    p = Path("motor_normativo/reglas/extremadura/fotovoltaica_autoconsumo.json")
    with p.open(encoding="utf-8") as f:
        data = json.load(f)
        
    fv1 = data["reglas"][0] # <= 10
    fv2 = data["reglas"][1] # > 10 and <= 100
    fv3 = data["reglas"][2] # > 100
    
    new_reglas = []
    # FV-001 split
    new_reglas.append(make_rule(fv1, "", None, 2, 2, " (<= 2 kW)"))
    new_reglas.append(make_rule(fv1, "", 2, 5, 5, " (2-5 kW)"))
    new_reglas.append(make_rule(fv1, "", 5, 10, 10, " (5-10 kW)"))
    
    # FV-002 split
    new_reglas.append(make_rule(fv2, "", 10, 20, 20, " (10-20 kW)"))
    new_reglas.append(make_rule(fv2, "", 20, 40, 40, " (20-40 kW)"))
    new_reglas.append(make_rule(fv2, "", 40, 100, 100, " (40-100 kW)"))
    
    # FV-003 split (just > 100)
    new_reglas.append(make_rule(fv3, "", 100, None, 101, " (> 100 kW)"))
    
    data["reglas"] = new_reglas
    with p.open('w', encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

if __name__ == "__main__":
    main()
