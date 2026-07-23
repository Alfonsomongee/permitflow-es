"""Estampa nivel_verificacion en los JSONs del motor normativo.

'verificada' = revisada contra normativa autonómica específica (hoy: Andalucía,
que tiene revisado_por con verificación deep-research).
'generica'   = plantilla basada en el flujo estatal (RD 244/2019) pendiente de
verificar la capa autonómica real (plataformas, registros, particularidades).

Un plan incorrecto es peor que un "próximamente": este flag permite a la UI
ser honesta sin retirar cobertura. Idempotente.
"""
import json
from pathlib import Path

REGLAS_DIR = Path(__file__).resolve().parents[1] / "motor_normativo" / "reglas"


def main() -> None:
    for ruta in sorted(REGLAS_DIR.glob("*/*.json")):
        data = json.loads(ruta.read_text(encoding="utf-8"))
        comunidad = ruta.parent.name
        nivel = "verificada" if comunidad == "andalucia" else "generica"
        if data.get("nivel_verificacion") == nivel:
            continue
        data["nivel_verificacion"] = nivel
        ruta.write_text(
            json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"[OK] {comunidad}/{ruta.name} -> {nivel}")


if __name__ == "__main__":
    main()
