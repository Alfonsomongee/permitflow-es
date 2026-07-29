"""Genera apps/web/content/cobertura_normativa.ts a partir de los ficheros JSON
de apps/api/motor_normativo/reglas/*/*.json.

Objetivo: que el selector de "Nueva instalación" en el frontend (Step1TipoUbicacion,
via tieneCobertura/nivelCobertura en components/nueva-instalacion/types.ts) refleje
el nivel de verificación REAL de cada combinación comunidad x tecnología, en vez de
un aviso binario hardcodeado ("solo Andalucía completa") que quedó desconectado del
contenido real del motor normativo hace tiempo.

Ejecutar tras cualquier cambio en motor_normativo/reglas/ que toque nivel_verificacion,
estado o huecos_verificacion:

    python3 scripts/generar_cobertura_normativa.py

No editar apps/web/content/cobertura_normativa.ts a mano: se sobrescribe.
"""

import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REGLAS_DIR = ROOT / "apps" / "api" / "motor_normativo" / "reglas"
SALIDA = ROOT / "apps" / "web" / "content" / "cobertura_normativa.ts"


def main() -> None:
    data: dict[str, dict[str, dict]] = {}
    for path in sorted(REGLAS_DIR.glob("*/*.json")):
        comunidad = path.parent.name
        tipo = path.stem
        contenido = json.loads(path.read_text(encoding="utf-8"))
        data.setdefault(comunidad, {})[tipo] = {
            "nivelVerificacion": contenido.get("nivel_verificacion", "generica"),
            "estado": contenido.get("estado"),
            "huecos": len(contenido.get("huecos_verificacion", [])),
        }

    lines = [
        "// GENERADO desde apps/api/motor_normativo/reglas/*/*.json — no editar a mano.",
        "// Regenerar con: python3 scripts/generar_cobertura_normativa.py",
        "// Refleja el nivel de verificación real de cada combinación comunidad x tecnología,",
        '// para que el selector de "Nueva instalación" no muestre un aviso binario desconectado',
        "// del contenido real del motor normativo.",
        "",
        "export interface CoberturaCombo {",
        "  nivelVerificacion: string;",
        "  estado: string | null;",
        "  huecos: number;",
        "}",
        "",
        "export const COBERTURA_NORMATIVA: Record<string, Record<string, CoberturaCombo>> = {",
    ]
    for comunidad in sorted(data.keys()):
        lines.append(f"  {comunidad}: {{")
        for tipo in sorted(data[comunidad].keys()):
            c = data[comunidad][tipo]
            estado_val = "null" if c["estado"] is None else json.dumps(c["estado"], ensure_ascii=False)
            lines.append(
                f"    {tipo}: {{ nivelVerificacion: {json.dumps(c['nivelVerificacion'], ensure_ascii=False)}, "
                f"estado: {estado_val}, huecos: {c['huecos']} }},"
            )
        lines.append("  },")
    lines.append("};")
    lines.append("")

    SALIDA.write_text("\n".join(lines), encoding="utf-8")
    print(f"Escrito {SALIDA} ({sum(len(v) for v in data.values())} combinaciones)")


if __name__ == "__main__":
    main()
