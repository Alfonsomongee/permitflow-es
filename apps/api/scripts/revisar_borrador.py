"""
revisar_borrador.py v2 — PermitFlow ES
========================================
Mejoras sobre v1:
  - Muestra el diff_sugerido de forma legible
  - Opción 'a' (aplicar) intenta aplicar el diff automáticamente al JSON
  - Actualiza el estado en Supabase al marcar como leída
"""

import sys
import json
from pathlib import Path
from datetime import datetime

API_DIR = Path(__file__).resolve().parent.parent
BORRADORES_DIR = API_DIR / "motor_normativo" / "borradores"
REGLAS_DIR = API_DIR / "motor_normativo" / "reglas"

sys.path.insert(0, str(API_DIR))


def aplicar_diff_automatico(diff: dict, reglas_dir: Path) -> bool:
    """
    Intenta aplicar el diff sugerido por el LLM a los JSONs del motor.
    Solo aplica cambios simples (modificar_campo). Los complejos requieren
    revisión manual.

    Devuelve una tupla (bool, dict) donde el bool indica si aplicó algo,
    y el dict contiene el contenido original de los archivos modificados
    para poder revertirlos si es necesario.
    """
    if not diff or not diff.get("cambios"):
        return False, {}

    aplicados = 0
    backups = {}
    for cambio in diff["cambios"]:
        tipo = cambio.get("tipo")
        if tipo != "modificar_campo":
            print(f"    ⚠ Cambio '{tipo}' requiere revisión manual")
            continue

        # Detectar qué archivo afecta
        for archivo in diff.get("archivos_afectados", []):
            ruta_json = (reglas_dir / archivo).resolve()

            # El LLM propone esta ruta a partir de texto externo (BOE/BOJA/etc.):
            # nunca debe poder salir de reglas_dir.
            if not ruta_json.is_relative_to(reglas_dir.resolve()):
                print(f"    ✗ Ruta fuera de reglas_dir, ignorada: {archivo}")
                continue

            if not ruta_json.exists():
                print(f"    ✗ Archivo no encontrado: {archivo}")
                continue

            try:
                with open(ruta_json, "r", encoding="utf-8") as f:
                    data = json.load(f)

                # Navegar por la ruta del campo (ej: "reglas[0].tramites[2].plazo_estimado_dias")
                ruta_campo = cambio.get("ruta", "")
                valor_nuevo = cambio.get("valor_nuevo")

                # Parser simple de rutas tipo "reglas[0].tramites[2].campo"
                obj = data
                partes = []
                import re
                tokens = re.split(r'[\.\[\]]', ruta_campo)
                tokens = [t for t in tokens if t]

                for t in tokens[:-1]:
                    if t.isdigit():
                        obj = obj[int(t)]
                    else:
                        obj = obj[t]

                campo_final = tokens[-1]
                if campo_final.isdigit():
                    obj[int(campo_final)] = valor_nuevo
                else:
                    obj[campo_final] = valor_nuevo

                # Actualizar versión y fecha
                if "version" in data:
                    partes_ver = data["version"].split(".")
                    partes_ver[-1] = str(int(partes_ver[-1]) + 1)
                    data["version"] = ".".join(partes_ver)
                data["ultima_revision"] = datetime.now().strftime("%Y-%m-%d")

                if ruta_json not in backups:
                    with open(ruta_json, "r", encoding="utf-8") as fb:
                        backups[ruta_json] = fb.read()

                with open(ruta_json, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)

                print(f"    ✓ Aplicado: {ruta_campo} → {valor_nuevo} en {archivo}")
                aplicados += 1

            except Exception as e:
                print(f"    ✗ Error aplicando diff en {archivo}: {e}")

    return aplicados > 0, backups


def main():
    if not BORRADORES_DIR.exists():
        print("No hay borradores pendientes.")
        return

    archivos = sorted(BORRADORES_DIR.glob("*.json"))

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
        print("✓ No hay borradores pendientes de revisión.")
        return

    print(f"\n{'='*60}")
    print(f"  {len(pendientes)} borradores pendientes")
    print(f"{'='*60}\n")

    for arch, data in pendientes:
        doc = data.get("documento", {})
        analisis = data.get("analisis", {})
        diff = analisis.get("diff_sugerido", {})

        urgencia = analisis.get("nivel_urgencia", "baja").upper()
        color = {"ALTA": "🔴", "MEDIA": "🟡", "BAJA": "🟢"}.get(urgencia, "⚪")

        print(f"{color} [{urgencia}] {doc.get('titulo', 'Sin título')[:80]}")
        print(f"   Resumen: {analisis.get('resumen', 'N/A')}")
        print(f"   Tipo: {analisis.get('tipo', 'N/A')}")
        print(f"   Verticales: {', '.join(analisis.get('tipos_instalacion_afectados', []))}")
        print(f"   CCAA: {', '.join(analisis.get('ccaa_afectadas', []))}")
        print(f"   URL: {doc.get('url', 'N/A')}")

        # Mostrar resumen del diff
        if diff and diff.get("cambios"):
            print(f"\n   📝 Diff sugerido: {diff.get('descripcion', '')}")
            for c in diff["cambios"][:3]:
                print(f"      • {c.get('tipo')}: {c.get('ruta', '')} → {c.get('valor_nuevo', '')}")
                print(f"        Motivo: {c.get('motivo', '')[:60]}")
            if len(diff["cambios"]) > 3:
                print(f"      ... y {len(diff['cambios']) - 3} cambios más")

        print(f"\n   Archivo: {arch.name}")
        print("-" * 60)

        while True:
            print("  Opciones: [v]er completo | [a]plicar diff auto | [s]í, marcar revisado | [n]o, descartar")
            resp = input("  → ").strip().lower()

            if resp == "v":
                print("\n" + json.dumps(analisis, indent=2, ensure_ascii=False) + "\n")

            elif resp == "a":
                print("\n  Intentando aplicar diff automáticamente...")
                ok, backups = aplicar_diff_automatico(diff, REGLAS_DIR)
                if ok:
                    import subprocess
                    print("  Ejecutando tests de validación (pytest)...")
                    # Asumimos que API_DIR es donde debe correr pytest
                    res = subprocess.run(
                        ["uv", "run", "pytest", "tests/"], 
                        cwd=str(API_DIR), 
                        capture_output=True, 
                        text=True
                    )
                    if res.returncode == 0:
                        print("  ✓ Diff aplicado y tests aprobados. Revisa los JSONs antes de commitear.")
                        data["revisado"] = True
                        data["aplicado_automaticamente"] = True
                        data["revisado_en"] = datetime.now().isoformat()
                    else:
                        print("  ✗ Los tests fallaron tras aplicar el diff. Revirtiendo cambios...")
                        for ruta, original in backups.items():
                            with open(ruta, "w", encoding="utf-8") as f:
                                f.write(original)
                        print("  ⚠ Borrador marcado como pendiente de revisión manual (tests fallidos).")
                        # Lo dejamos sin marcar como revisado para que vuelva a salir
                        data["revisado"] = False
                        data["aplicado_automaticamente"] = False
                        data.pop("revisado_en", None)
                        
                        # Guardar logs del error en el objeto para que el usuario pueda ver por qué falló
                        data["ultimo_error_tests"] = res.stdout + "\n" + res.stderr
                else:
                    print("  ✗ Diff requiere revisión manual o estaba vacío.")
                    data["revisado"] = True
                    data["aplicado_automaticamente"] = False
                    data["revisado_en"] = datetime.now().isoformat()

                with open(arch, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                break

            elif resp == "s":
                data["revisado"] = True
                data["revisado_en"] = datetime.now().isoformat()
                with open(arch, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                print("  ✓ Marcado como revisado")
                break

            elif resp == "n":
                data["revisado"] = True
                data["descartado"] = True
                data["revisado_en"] = datetime.now().isoformat()
                with open(arch, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                print("  ✗ Descartado")
                break
            else:
                print("  Respuesta no válida (v/a/s/n)")

        print()

    print("✓ Revisión completada.")


if __name__ == "__main__":
    main()
