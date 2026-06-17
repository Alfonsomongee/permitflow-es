import sys
import json
from pathlib import Path

API_DIR = Path(__file__).resolve().parent.parent
BORRADORES_DIR = API_DIR / "motor_normativo" / "borradores"

def main():
    if not BORRADORES_DIR.exists():
        print("No hay borradores pendientes (directorio no existe).")
        return

    archivos = [f for f in BORRADORES_DIR.glob("*.json")]
    
    pendientes = []
    for arch in archivos:
        try:
            with open(arch, "r", encoding="utf-8") as f:
                data = json.load(f)
                if not data.get("revisado", False):
                    pendientes.append((arch, data))
        except Exception as e:
            print(f"Error leyendo {arch.name}: {e}")
            
    if not pendientes:
        print("No hay borradores pendientes de revisión.")
        return
        
    print(f"Tienes {len(pendientes)} borradores pendientes.\n")
    
    for arch, data in pendientes:
        doc = data.get("documento", {})
        analisis = data.get("analisis", {})
        
        print("-" * 60)
        print(f"ARCHIVO: {arch.name}")
        print(f"TÍTULO: {doc.get('titulo')}")
        print(f"URGENCIA: {analisis.get('nivel_urgencia', 'N/A').upper()}")
        print(f"RESUMEN: {analisis.get('resumen')}")
        print("CAMBIOS DETECTADOS:")
        if analisis.get("tramites_nuevos"):
            print(f"  - Nuevos: {len(analisis['tramites_nuevos'])}")
        if analisis.get("tramites_modificados"):
            print(f"  - Modificados: {len(analisis['tramites_modificados'])}")
        if analisis.get("tramites_eliminados"):
            print(f"  - Eliminados: {len(analisis['tramites_eliminados'])}")
            
        print("-" * 60)
        
        while True:
            resp = input("¿Aplicar este cambio? (s/n/ver): ").strip().lower()
            if resp == 'ver':
                print(json.dumps(analisis, indent=2, ensure_ascii=False))
            elif resp == 's':
                print("\nPara aplicar este cambio, abre el JSON correspondiente en motor_normativo/reglas/ e incorpora los cambios detallados en el análisis.")
                data["revisado"] = True
                with open(arch, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                break
            elif resp == 'n':
                print("Descartado.")
                data["revisado"] = True
                data["descartado"] = True
                with open(arch, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                break
            else:
                print("Respuesta no válida.")

    print("\nRevisión completada.")

if __name__ == "__main__":
    main()
