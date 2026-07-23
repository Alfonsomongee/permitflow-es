import os
import glob

BASE_DIR = r"C:\Users\aphmo\Proyectos\permitflow-es\apps\api"
OUTPUT_FILE = r"C:\Users\aphmo\.gemini\antigravity\brain\f04b0969-1cae-48da-923e-86f89716b12b\backend_architecture_full.md"

DIRS_TO_SCAN = [
    "models",
    "routers",
    "schemas",
    "servicios",
    "motor_normativo",
]

FILES_TO_SCAN = [
    "main.py",
    "config.py",
    "database.py",
    "dependencies.py" # just in case
]

def generate_dump():
    with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
        out.write("# Arquitectura Backend (Volcado Completo)\n\n")
        out.write("Este documento contiene un volcado masivo de todos los archivos relevantes que componen la lógica de la API en Python (FastAPI, SQLAlchemy, motor normativo de IA, etc.).\n\n")
        
        # 1. Archivos base
        out.write("## 1. Entrada y Configuración\n\n")
        for f in FILES_TO_SCAN:
            path = os.path.join(BASE_DIR, f)
            if os.path.exists(path):
                out.write(f"### Archivo: `{f}`\n\n")
                try:
                    with open(path, "r", encoding="utf-8") as inf:
                        out.write("```python\n" + inf.read() + "\n```\n\n")
                except Exception as e:
                    out.write(f"*Error leyendo {f}: {e}*\n\n")
        
        # 2. Directorios
        for d in DIRS_TO_SCAN:
            out.write(f"## Directorio: `{d}`\n\n")
            search_path = os.path.join(BASE_DIR, d, "**", "*.*")
            files = glob.glob(search_path, recursive=True)
            
            # Filtrar solo py, json (reglas)
            files = [f for f in files if f.endswith(('.py', '.json')) and "__pycache__" not in f]
            
            if not files:
                out.write(f"*No se encontraron archivos en {d}*\n\n")
                continue
                
            for filepath in files:
                rel_path = os.path.relpath(filepath, BASE_DIR).replace("\\", "/")
                
                out.write(f"### Archivo: `{rel_path}`\n\n")
                
                try:
                    with open(filepath, "r", encoding="utf-8") as inf:
                        content = inf.read()
                        ext = rel_path.split('.')[-1]
                        lang = ext if ext in ['py', 'json'] else 'text'
                        if lang == 'py': lang = 'python'
                        out.write(f"```{lang}\n{content}\n```\n\n")
                except Exception as e:
                    out.write(f"*Error leyendo {rel_path}: {e}*\n\n")

if __name__ == "__main__":
    generate_dump()
    print("Dump backend completado.")
