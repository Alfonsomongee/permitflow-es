import json
import pathlib

def main():
    f = pathlib.Path("apps/api/motor_normativo/reglas/andalucia/climatizacion_aerotermia.json")
    with open(f, "r", encoding="utf-8") as file:
        data = json.load(file)

    new_reglas = []
    for r in data.get("reglas", []):
        if r["id"] == "clima-memoria-5-70":
            # split into dos reglas based on 'uso'
            # The schema allows 'residencial', 'industrial', 'terciario'
            
            # Rule 1: uso == residencial
            r1 = dict(r)
            r1["id"] = "clima-memoria-5-70-residencial"
            r1["descripcion"] = r["descripcion"] + " (Uso residencial)"
            r1["condicion"] = {
                "and": [
                    r["condicion"],
                    {"==": [{"var": "uso"}, "residencial"]}
                ]
            }
            # copy tramites deeply to modify one
            t1 = [dict(t) for t in r["tramites"]]
            t1[0]["coste_estimado"] = "21.94 EUR -- tarifa 7.2.3.1, Ley 10/2021 art. 44"
            r1["tramites"] = t1
            new_reglas.append(r1)
            
            # Rule 2: uso != residencial
            r2 = dict(r)
            r2["id"] = "clima-memoria-5-70-otros"
            r2["descripcion"] = r["descripcion"] + " (Otros usos)"
            r2["condicion"] = {
                "and": [
                    r["condicion"],
                    {"!=": [{"var": "uso"}, "residencial"]}
                ]
            }
            t2 = [dict(t) for t in r["tramites"]]
            t2[0]["coste_estimado"] = "45.77 EUR -- tarifa 7.2.3.1, Ley 10/2021 art. 44"
            r2["tramites"] = t2
            new_reglas.append(r2)
            
        else:
            new_reglas.append(r)

    data["reglas"] = new_reglas

    with open(f, "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
        file.write("\n")

if __name__ == "__main__":
    main()
