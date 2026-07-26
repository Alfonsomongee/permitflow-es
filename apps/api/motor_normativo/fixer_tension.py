import json
import re
import pathlib

def clean_condition(cond, remove_tension=True, remove_modalidad=True):
    if not isinstance(cond, dict):
        return cond
    op, args = next(iter(cond.items()))
    if not isinstance(args, list):
        return cond
    
    if op == "and" or op == "or":
        new_args = []
        for a in args:
            if isinstance(a, dict):
                inner_op, inner_args = next(iter(a.items()))
                if inner_op == "==" and isinstance(inner_args, list):
                    if isinstance(inner_args[0], dict) and inner_args[0].get("var") == "tension" and remove_tension:
                        continue
                    if isinstance(inner_args[0], dict) and inner_args[0].get("var") == "modalidad" and remove_modalidad:
                        continue
            new_args.append(clean_condition(a, remove_tension, remove_modalidad))
        
        if len(new_args) == 0:
            return True
        elif len(new_args) == 1:
            return new_args[0]
        else:
            return {op: new_args}
    else:
        # Check if this node itself is tension or modalidad == 
        if op == "==":
            if isinstance(args[0], dict) and args[0].get("var") == "tension" and remove_tension:
                return True
            if isinstance(args[0], dict) and args[0].get("var") == "modalidad" and remove_modalidad:
                return True
    return cond

def main():
    root = pathlib.Path("apps/api/motor_normativo/reglas")
    files_to_fix = [
        "aragon/fotovoltaica_autoconsumo.json",
        "asturias/fotovoltaica_autoconsumo.json",
        "canarias/fotovoltaica_autoconsumo.json",
        "castilla_la_mancha/fotovoltaica_autoconsumo.json",
        "galicia/fotovoltaica_autoconsumo.json",
        "murcia/fotovoltaica_autoconsumo.json"
    ]
    
    for rel_path in files_to_fix:
        f = root / rel_path
        with open(f, "r", encoding="utf-8") as file:
            data = json.load(file)

        new_reglas = []
        for r in data.get("reglas", []):
            is_at_rule = False
            # check if it's the AT rule
            # it usually has {"or": [{">": ...}, {"==": [{"var": "tension"}, "AT"]}]}
            if "or" in r.get("condicion", {}):
                for sub in r["condicion"]["or"]:
                    if isinstance(sub, dict) and "==" in sub:
                        if isinstance(sub["=="][0], dict) and sub["=="][0].get("var") == "tension" and sub["=="][1] == "AT":
                            is_at_rule = True
            
            if is_at_rule:
                # Split it into two rules: one for > 100, one for AT <= 100
                r_base = dict(r)
                r_base["condicion"] = clean_condition(r["condicion"], remove_tension=True, remove_modalidad=True)
                new_reglas.append(r_base)
                
                r_at = dict(r)
                r_at["id"] = r["id"] + "-AT"
                r_at["descripcion"] = r["descripcion"] + " (Refinamiento AT)"
                
                # find the power limit (e.g. 100)
                limit = 100
                for sub in r["condicion"]["or"]:
                    if isinstance(sub, dict) and ">" in sub:
                        if isinstance(sub[">"][0], dict) and sub[">"][0].get("var") == "potencia_kw":
                            limit = sub[">"][1]
                
                r_at["condicion"] = {"and": [{"==": [{"var": "tension"}, "AT"]}, {"<=": [{"var": "potencia_kw"}, limit]}]}
                new_reglas.append(r_at)
            else:
                if "modalidad" in json.dumps(r.get("condicion", {})):
                    # For Aragon, we might have specific modalidad rules.
                    # We need to turn them into refinements.
                    # Actually Aragon has: 
                    # 1. sin_excedentes (exento)
                    # 2. con_excedentes <= 100 (avales)
                    pass
                r["condicion"] = clean_condition(r["condicion"], remove_tension=True, remove_modalidad=False)
                new_reglas.append(r)

        data["reglas"] = new_reglas
        
        # Add validation for tension
        if "validaciones" not in data:
            data["validaciones"] = []
        data["validaciones"].append({
            "severidad": "aviso",
            "campos_requeridos": ["tension"],
            "mensaje": "Si no se especifica el nivel de tensión, el plan asume Baja Tensión (BT) por defecto."
        })
        
        with open(f, "w", encoding="utf-8") as file:
            json.dump(data, file, ensure_ascii=False, indent=2)
            file.write("\n")

if __name__ == "__main__":
    main()
