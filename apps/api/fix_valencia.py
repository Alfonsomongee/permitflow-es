import json
from pathlib import Path
import re

def main():
    for p in Path("motor_normativo/reglas").rglob("*.json"):
        if "comunidad_valenciana" in p.parts:
            content = p.read_text(encoding="utf-8")
            # Replace "comunidad": "valencia" with "comunidad": "comunidad_valenciana"
            content = re.sub(r'"comunidad"\s*:\s*"valencia"', '"comunidad": "comunidad_valenciana"', content)
            p.write_text(content, encoding="utf-8")

if __name__ == "__main__":
    main()
