import json
import re
import pathlib

def clean_notas(notas):
    if not notas: return notas
    PATRONES_OPERATIVOS = [
        r"derivar a portal", r"prohibido el enrutamiento", r"bloqueo de redirecc",
        r"no enviar a", r"solo enviar a", r"redirecc", r"intranet\.",
        r"frente al lote", r"LOTE \d", r"generado autom",
    ]
    for pat in PATRONES_OPERATIVOS:
        # We try to remove sentences containing these patterns, or just remove the pattern itself.
        # Actually, it's safer to remove the whole sentence if possible, or just the part.
        # Let's use a regex that matches the pattern and optionally surrounding parens.
        # A simple approach is just replace the matches, but that might leave broken grammar.
        # Let's just remove the sentences.
        pass
        
    # It's better to just remove anything that matches. Let's do a basic re.sub
    new_notas = notas
    new_notas = re.sub(r"\(?[^\(]*?derivar a portal[^\)]*?\)?", "", new_notas, flags=re.I)
    new_notas = re.sub(r"\(?[^\(]*?solo enviar a[^\)]*?\)?", "", new_notas, flags=re.I)
    new_notas = re.sub(r"\(?[^\(]*?frente al lote[^\)]*?\)?", "", new_notas, flags=re.I)
    new_notas = re.sub(r"\(?[^\(]*?generado autom[^\)]*?\)?", "", new_notas, flags=re.I)
    
    new_notas = re.sub(r"\s{2,}", " ", new_notas).strip()
    return new_notas if new_notas else None

def main():
    root = pathlib.Path("apps/api/motor_normativo/reglas")
    
    for f in root.rglob("*.json"):
        if f.name == "_schema.json": continue
        with open(f, "r", encoding="utf-8") as file:
            data = json.load(file)
            
        changed = False
        for r in data.get("reglas", []):
            for t in r.get("tramites", []):
                notas = t.get("notas")
                new_notas = clean_notas(notas)
                if new_notas != notas:
                    t["notas"] = new_notas
                    changed = True
                    
        if changed:
            with open(f, "w", encoding="utf-8") as file:
                json.dump(data, file, ensure_ascii=False, indent=2)
                file.write("\n")

if __name__ == "__main__":
    main()
