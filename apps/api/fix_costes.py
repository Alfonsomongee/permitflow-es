import json
import copy
from pathlib import Path
import re

def split_rule(r, thresholds):
    new_rules = []
    for i, t in enumerate(thresholds):
        r_new = copy.deepcopy(r)
        r_new['id'] = f"{r['id']}-T{i+1}"
        r_new['descripcion'] = r['descripcion'] + t['suffix']
        
        r_new['condicion'] = {
            "and": [
                r['condicion'],
                t['cond']
            ]
        }
        
        # Replace the cost string entirely in coste_estimado
        for tr in r_new.get('tramites', []):
            if tr.get('coste_estimado'):
                # We just replace the complex string with the specific cost for this tier
                tr['coste_estimado'] = t['cost']
                
        new_rules.append(r_new)
    return new_rules

def process_file(path_str, replace_map):
    p = Path(path_str)
    with p.open(encoding="utf-8") as f:
        data = json.load(f)
        
    new_reglas = []
    for r in data['reglas']:
        if r['id'] in replace_map:
            t = replace_map[r['id']]
            new_rules = split_rule(r, t)
            new_reglas.extend(new_rules)
        else:
            new_reglas.append(r)
            
    data['reglas'] = new_reglas
    with p.open('w', encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

def main():
    # 1. andalucia/fotovoltaica_autoconsumo.json
    t_andalucia_6000 = [
        {'cond': {"<=": [{"var": "presupuesto_eur"}, 6000]}, 'cost': "62.25 EUR", 'suffix': " (presupuesto <= 6k)"},
        {'cond': {"and": [ {">": [{"var": "presupuesto_eur"}, 6000]}, {"<=": [{"var": "presupuesto_eur"}, 60000]} ]}, 'cost': "100.00 EUR (estimado tramo medio)", 'suffix': " (presupuesto 6k-60k)"},
        {'cond': {">": [{"var": "presupuesto_eur"}, 60000]}, 'cost': "159.18 EUR", 'suffix': " (presupuesto > 60k)"}
    ]
    t_andalucia_5000 = [
        {'cond': {"<=": [{"var": "presupuesto_eur"}, 5000]}, 'cost': "320.65 EUR", 'suffix': " (presupuesto <= 5k)"},
        {'cond': {"and": [ {">": [{"var": "presupuesto_eur"}, 5000]}, {"<=": [{"var": "presupuesto_eur"}, 500000]} ]}, 'cost': "500.00 EUR (estimado tramo medio)", 'suffix': " (presupuesto 5k-500k)"},
        {'cond': {">": [{"var": "presupuesto_eur"}, 500000]}, 'cost': "1061.21 EUR", 'suffix': " (presupuesto > 500k)"}
    ]
    process_file("motor_normativo/reglas/andalucia/fotovoltaica_autoconsumo.json", {
        "AND-FV-001B": t_andalucia_6000,
        "AND-FV-002": t_andalucia_6000,
        "AND-FV-004": t_andalucia_5000
    })

    # 2. andalucia/acs.json
    t_acs_001 = [
        {'cond': {"<=": [{"var": "presupuesto_eur"}, 10000]}, 'cost': "21.94 EUR", 'suffix': " (presupuesto <= 10k)"},
        {'cond': {">": [{"var": "presupuesto_eur"}, 10000]}, 'cost': "45.77 EUR", 'suffix': " (presupuesto > 10k)"}
    ]
    t_acs_002 = [
        {'cond': {"<=": [{"var": "presupuesto_eur"}, 5000]}, 'cost': "66.43 EUR", 'suffix': " (presupuesto <= 5k)"},
        {'cond': {"and": [ {">": [{"var": "presupuesto_eur"}, 5000]}, {"<=": [{"var": "presupuesto_eur"}, 300000]} ]}, 'cost': "200.00 EUR (estimado tramo medio)", 'suffix': " (presupuesto 5k-300k)"},
        {'cond': {">": [{"var": "presupuesto_eur"}, 300000]}, 'cost': "424.48 EUR", 'suffix': " (presupuesto > 300k)"}
    ]
    process_file("motor_normativo/reglas/andalucia/acs.json", {
        "AND-ACS-001": t_acs_001,
        "AND-ACS-002": t_acs_002
    })

    # 3. andalucia/climatizacion_aerotermia.json
    process_file("motor_normativo/reglas/andalucia/climatizacion_aerotermia.json", {
        "clima-proyecto-mayor-70": t_acs_002
    })

    # 4. andalucia/gas_baja_presion.json
    t_gas_con_proyecto = [
        {'cond': {"<=": [{"var": "presupuesto_eur"}, 2000]}, 'cost': "62.25 EUR", 'suffix': " (presupuesto <= 2k)"},
        {'cond': {"and": [ {">": [{"var": "presupuesto_eur"}, 2000]}, {"<=": [{"var": "presupuesto_eur"}, 50000]} ]}, 'cost': "100.00 EUR (estimado tramo medio)", 'suffix': " (presupuesto 2k-50k)"},
        {'cond': {">": [{"var": "presupuesto_eur"}, 50000]}, 'cost': "212.24 EUR", 'suffix': " (presupuesto > 50k)"}
    ]
    process_file("motor_normativo/reglas/andalucia/gas_baja_presion.json", {
        "gas-con-proyecto": t_gas_con_proyecto
    })

    # 5. andalucia/irve.json
    process_file("motor_normativo/reglas/andalucia/irve.json", {
        "AND-IRVE-005": t_andalucia_6000
    })

    # 6. comunidad_valenciana/fotovoltaica_autoconsumo.json
    t_cv = [
        {'cond': {"<=": [{"var": "presupuesto_eur"}, 6600]}, 'cost': "109.54 EUR", 'suffix': " (presupuesto <= 6600)"},
        {'cond': {">": [{"var": "presupuesto_eur"}, 6600]}, 'cost': "121.56 EUR (base + recargo)", 'suffix': " (presupuesto > 6600)"}
    ]
    process_file("motor_normativo/reglas/comunidad_valenciana/fotovoltaica_autoconsumo.json", {
        "CV-FV-3": t_cv,
        "CV-FV-4": t_cv
    })

    # 7. madrid/fotovoltaica_autoconsumo.json
    t_mad = [
        {'cond': {"<=": [{"var": "presupuesto_eur"}, 5000]}, 'cost': "51.32 EUR", 'suffix': " (presupuesto <= 5k)"},
        {'cond': {">": [{"var": "presupuesto_eur"}, 5000]}, 'cost': "100.00 EUR (estimado > 5k)", 'suffix': " (presupuesto > 5k)"}
    ]
    process_file("motor_normativo/reglas/madrid/fotovoltaica_autoconsumo.json", {
        "MAD-FV-3": t_mad,
        "MAD-FV-4": t_mad
    })

    # 8. pais_vasco/fotovoltaica_autoconsumo.json
    t_pv = [
        {'cond': {"<=": [{"var": "presupuesto_eur"}, 600000]}, 'cost': "128.10 EUR", 'suffix': " (presupuesto <= 600k)"},
        {'cond': {"and": [ {">": [{"var": "presupuesto_eur"}, 600000]}, {"<=": [{"var": "presupuesto_eur"}, 1500000]} ]}, 'cost': "204.96 EUR (estimado)", 'suffix': " (presupuesto 600k-1.5M)"},
        {'cond': {">": [{"var": "presupuesto_eur"}, 1500000]}, 'cost': "787.77 EUR", 'suffix': " (presupuesto > 1.5M)"}
    ]
    process_file("motor_normativo/reglas/pais_vasco/fotovoltaica_autoconsumo.json", {
        "PV-FV-3": t_pv
    })

if __name__ == '__main__':
    main()
