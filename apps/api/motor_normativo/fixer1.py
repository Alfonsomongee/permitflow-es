import json
import re
import pathlib
import sys

PREFIX_MAP = {
    "cantabria": "CNT",
    "baleares": "BAL",
}

def get_prefix(comunidad_slug):
    if comunidad_slug in PREFIX_MAP:
        return PREFIX_MAP[comunidad_slug]
    return None

def main():
    if len(sys.argv) < 2:
        print("Usage: python fixer.py <action>")
        return
    action = sys.argv[1]

    root = pathlib.Path("apps/api/motor_normativo/reglas")
    for f in root.rglob("*.json"):
        if f.name == "_schema.json": continue
        
        with open(f, "r", encoding="utf-8") as file:
            data = json.load(file)

        comunidad_slug = f.parent.name
        changed = False

        if action == "slugs":
            if data.get("comunidad") != comunidad_slug:
                data["comunidad"] = comunidad_slug
                changed = True

        elif action == "incertidumbre":
            incertidumbre = False
            for r in data.get("reglas", []):
                for t in r.get("tramites", []):
                    ce = str(t.get("coste_estimado") or "")
                    notas = str(t.get("notas") or "")
                    if re.search(r"no verificad|consultar|no confirmad|presuntamente|sin restricciones", ce, re.I):
                        incertidumbre = True
                    if re.search(r"no confirmad|presuntamente|no verificad", notas, re.I):
                        incertidumbre = True

            if incertidumbre and data.get("nivel_verificacion") == "verificada":
                data["nivel_verificacion"] = "generica"
                changed = True

        elif action == "lenguaje":
            for r in data.get("reglas", []):
                for t in r.get("tramites", []):
                    notas = t.get("notas")
                    if notas:
                        new_notas = re.sub(r"\(?prohibido el enrutamiento[^\)]*\)?|\(?bloqueo de redirecc[^\)]*\)?", "", notas, flags=re.I).strip()
                        if new_notas != notas:
                            t["notas"] = new_notas if new_notas else None
                            changed = True

        elif action == "paralelo_con":
            for r in data.get("reglas", []):
                for t in r.get("tramites", []):
                    if "paralelo_con" not in t:
                        t["paralelo_con"] = None
                        changed = True
                    if "regla_id" in t:
                        del t["regla_id"]
                        changed = True

        elif action == "prefijos":
            prefix = get_prefix(comunidad_slug)
            if prefix:
                for r in data.get("reglas", []):
                    old_id = r["id"]
                    parts = old_id.split("-")
                    if len(parts) >= 2 and parts[0] != prefix:
                        parts[0] = prefix
                        r["id"] = "-".join(parts)
                        changed = True

        if changed:
            with open(f, "w", encoding="utf-8") as file:
                json.dump(data, file, ensure_ascii=False, indent=2)
                file.write("\n")

if __name__ == "__main__":
    main()
