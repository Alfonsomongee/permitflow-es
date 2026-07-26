import json
from pathlib import Path
import re

def main():
    for p in Path("motor_normativo/reglas").rglob("*.json"):
        if p.name == "irve.json":
            content = p.read_text(encoding="utf-8")
            
            # Replace "var": "acceso" with "var": "acceso_publico"
            content = re.sub(r'"var"\s*:\s*"acceso"', '"var": "acceso_publico"', content)
            
            # Replace "var": "ubicacion" with "var": "ubicacion_irve"
            content = re.sub(r'"var"\s*:\s*"ubicacion"', '"var": "ubicacion_irve"', content)
            
            p.write_text(content, encoding="utf-8")
            
    # Also fix valencia being reported as not a valid slug! It should be comunidad_valenciana
    # Actually wait, the folder name is 'valencia'. Let's rename the folder to 'comunidad_valenciana'
    p = Path("motor_normativo/reglas/valencia")
    if p.exists():
        import shutil
        shutil.move(str(p), "motor_normativo/reglas/comunidad_valenciana")

if __name__ == "__main__":
    main()
