import os
import glob

# Rutas clave a escanear dentro de apps/web
BASE_DIR = r"C:\Users\aphmo\Proyectos\permitflow-es\apps\web"
OUTPUT_FILE = r"C:\Users\aphmo\.gemini\antigravity\brain\f04b0969-1cae-48da-923e-86f89716b12b\frontend_architecture_full.md"

DIRS_TO_SCAN = [
    "app",
    "components/layouts",
    "components/dashboard",
    "components/plan-tramitacion",
    "components/nueva-instalacion",
    "components/marketing",
    "components/chat",
    "lib",
    "types"
]

FILES_TO_SCAN = [
    "tailwind.config.ts",
    "next.config.mjs"
]

def generate_dump():
    with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
        out.write("# Arquitectura Frontend (Volcado Completo)\n\n")
        out.write("Este documento contiene un volcado masivo de **todos los archivos relevantes** que componen la lógica de la aplicación en Next.js (páginas, layouts, componentes de negocio, utilidades y tipos). Se omiten únicamente los componentes genéricos de UI (shadcn) para no generar ruido innecesario.\n\n")
        
        # 1. Configuración
        out.write("## 1. Configuración Global\n\n")
        for f in FILES_TO_SCAN:
            path = os.path.join(BASE_DIR, f)
            if os.path.exists(path):
                out.write(f"### Archivo: `{f}`\n\n")
                with open(path, "r", encoding="utf-8") as inf:
                    out.write("```ts\n" + inf.read() + "\n```\n\n")
        
        # 2. Directorios
        for d in DIRS_TO_SCAN:
            out.write(f"## Directorio: `{d}`\n\n")
            search_path = os.path.join(BASE_DIR, d, "**", "*.*")
            files = glob.glob(search_path, recursive=True)
            
            # Filtrar solo ts, tsx, css
            files = [f for f in files if f.endswith(('.ts', '.tsx', '.css'))]
            
            if not files:
                out.write(f"*No se encontraron archivos en {d}*\n\n")
                continue
                
            for filepath in files:
                # Omitir archivos de componentes UI base si están en otra carpeta, pero como filtramos DIRS_TO_SCAN, estamos a salvo.
                rel_path = os.path.relpath(filepath, BASE_DIR)
                # Formatear la ruta para linux style
                rel_path = rel_path.replace("\\", "/")
                
                out.write(f"### Archivo: `{rel_path}`\n\n")
                
                # Intentar leer el contenido (evitar binarios por si acaso)
                try:
                    with open(filepath, "r", encoding="utf-8") as inf:
                        content = inf.read()
                        ext = rel_path.split('.')[-1]
                        lang = ext if ext in ['ts', 'tsx', 'css'] else 'text'
                        out.write(f"```{lang}\n{content}\n```\n\n")
                except Exception as e:
                    out.write(f"*Error leyendo {rel_path}: {e}*\n\n")

if __name__ == "__main__":
    generate_dump()
    print("Dump completado.")
