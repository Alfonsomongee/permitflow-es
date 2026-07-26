import json
import pathlib
import re

def main():
    root = pathlib.Path("apps/api/motor_normativo/reglas")
    
    # Fix Asturias
    f_asturias = root / "asturias/fotovoltaica_autoconsumo.json"
    with open(f_asturias, "r", encoding="utf-8") as file:
        data = json.load(file)
    for r in data.get("reglas", []):
        for t in r.get("tramites", []):
            if t.get("plataforma") == "Aplicación de instalaciones eléctricas (www70.asturias.es/electricas)":
                t["plataforma"] = "Aplicación de instalaciones eléctricas del Principado de Asturias"
    with open(f_asturias, "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
        file.write("\n")

    # Fix Andalucia PUES and TECI URL
    pues_url = "https://www.juntadeandalucia.es/haciendayadministracionpublica/vea-web/faces/vi/procedimientos.xhtml"
    teci_url = "https://www.juntadeandalucia.es/empleoempresaycomercio/teci/login.jsp"
    
    for f in root.rglob("*.json"):
        if f.name == "_schema.json": continue
        with open(f, "r", encoding="utf-8") as file:
            data = json.load(file)
        
        changed = False
        for r in data.get("reglas", []):
            for t in r.get("tramites", []):
                plat = t.get("plataforma")
                url = t.get("plataforma_url")
                if plat == "PUES" and not url:
                    t["plataforma_url"] = pues_url
                    changed = True
                elif plat and "TECI" in plat and not url:
                    t["plataforma_url"] = teci_url
                    changed = True

        if changed:
            with open(f, "w", encoding="utf-8") as file:
                json.dump(data, file, ensure_ascii=False, indent=2)
                file.write("\n")

if __name__ == "__main__":
    main()
