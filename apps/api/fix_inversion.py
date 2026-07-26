import json
import glob
from pathlib import Path
import re

def fix_split_rules(file_path):
    p = Path(file_path)
    with p.open(encoding="utf-8") as f:
        data = json.load(f)
        
    for r in data.get("reglas", []):
        # Remove -T1, -T2, etc from IDs
        if re.search(r"-T\d+$", r["id"]):
            r["id"] = re.sub(r"-T\d+$", "", r["id"])
            
    with p.open('w', encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

def main():
    # 1. Rename inversion_eur to inversion_eur in all files
    for filepath in Path(".").rglob("*.json"):
        if filepath.parent.name == "reglas" or filepath.parent.parent.name == "reglas":
            with filepath.open(encoding="utf-8") as f:
                content = f.read()
            new_content = content.replace("inversion_eur", "inversion_eur")
            with filepath.open('w', encoding="utf-8") as f:
                f.write(new_content)
                
    for filepath in Path(".").rglob("*.py"):
        with filepath.open(encoding="utf-8") as f:
            content = f.read()
        new_content = content.replace("inversion_eur", "inversion_eur")
        with filepath.open('w', encoding="utf-8") as f:
            f.write(new_content)
            
    # 2. Fix the -T suffix
    files_to_fix = [
        "motor_normativo/reglas/andalucia/fotovoltaica_autoconsumo.json",
        "motor_normativo/reglas/andalucia/acs.json",
        "motor_normativo/reglas/andalucia/climatizacion_aerotermia.json",
        "motor_normativo/reglas/andalucia/gas_baja_presion.json",
        "motor_normativo/reglas/andalucia/irve.json",
        "motor_normativo/reglas/comunidad_valenciana/fotovoltaica_autoconsumo.json",
        "motor_normativo/reglas/madrid/fotovoltaica_autoconsumo.json",
        "motor_normativo/reglas/pais_vasco/fotovoltaica_autoconsumo.json"
    ]
    for f in files_to_fix:
        if Path(f).exists():
            fix_split_rules(f)

if __name__ == "__main__":
    main()
