"""Genera apps/web/content/benchmarks_fv.ts a partir de
apps/api/servicios/constantes_mercado_fv.json.

Antes las constantes de mercado (no normativas) de fotovoltaica residencial
-- precio_kwh, coste_eur_por_kwp.residencial, ratio_autoconsumo_sin_bateria --
vivían hardcodeadas por duplicado en calculo_financiero.py (backend) y en
benchmarks_fv.ts (frontend), con un comentario en cada fichero pidiendo
mantenerlos sincronizados a mano. servicios/constantes_mercado_fv.json es
ahora la fuente única: calculo_financiero.py la lee directamente (mismo
runtime), y este script regenera el .ts para el frontend, que no puede
importar JSON de apps/api directamente sin acoplar el build de Next.js al
backend (plan de acción consolidado 2026-08-12, P-17).

Ejecutar tras cualquier cambio en servicios/constantes_mercado_fv.json:

    python3 scripts/generar_benchmarks_fv.py

No editar apps/web/content/benchmarks_fv.ts a mano: se sobrescribe.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FUENTE = ROOT / "apps" / "api" / "servicios" / "constantes_mercado_fv.json"
SALIDA = ROOT / "apps" / "web" / "content" / "benchmarks_fv.ts"


def _ts_valor(v) -> str:
    """Serializa un valor Python al literal TS equivalente.

    json.dumps ya vale para strings/números/null, salvo que None debe salir
    como `null` (json.dumps ya lo hace) y los strings deben usar comillas
    dobles escapando comillas internas (json.dumps también lo hace) --
    basta con reexportarlo tal cual.
    """
    return json.dumps(v, ensure_ascii=False)


def _bloque(nombre: str, campos: dict, indent: str = "  ") -> list[str]:
    lineas = [f"{indent}{nombre}: {{"]
    for clave, valor in campos.items():
        if isinstance(valor, dict):
            lineas.extend(_bloque(clave, valor, indent + "  "))
        else:
            lineas.append(f"{indent}  {clave}: {_ts_valor(valor)},")
    lineas.append(f"{indent}}},")
    return lineas


def main() -> None:
    data = json.loads(FUENTE.read_text(encoding="utf-8"))
    data = {k: v for k, v in data.items() if not k.startswith("_")}

    lineas = [
        "// GENERADO desde apps/api/servicios/constantes_mercado_fv.json — no editar a mano.",
        "// Regenerar con: python3 scripts/generar_benchmarks_fv.py",
        "// Fuente única de las constantes de mercado (no normativas) de fotovoltaica",
        "// residencial, compartida con apps/api/servicios/calculo_financiero.py -- evita que",
        "// el simulador de \"Orientación\" (frontend) y el Simulador AI (backend) diverjan",
        "// en silencio sobre el mismo dato (plan de acción consolidado 2026-08-12, P-17).",
        "",
        "export const BENCHMARKS_FV = {",
    ]
    for clave, valor in data.items():
        lineas.extend(_bloque(clave, valor))
    lineas.append("} as const;")
    lineas.append("")

    SALIDA.write_text("\n".join(lineas), encoding="utf-8")
    print(f"Escrito {SALIDA}")


if __name__ == "__main__":
    main()
