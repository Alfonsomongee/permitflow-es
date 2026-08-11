"""Genera apps/web/content/campos_condicionales.ts a partir de las condiciones
json-logic de apps/api/motor_normativo/reglas/*/*.json.

Objetivo: que el formulario de "Nueva instalación" sepa, para cada combinación
comunidad x tecnología, qué campos usan realmente las reglas de esa combinación,
y pregunte solo esos.

Origen: auditoría QA 2026-08-11, hallazgo C-01. El formulario no recogía 9 campos
que las reglas sí usan. Como json-logic evalúa una variable ausente como *falsy*,
la rama negativa ganaba en silencio y desaparecían del plan trámites reales
(legionela, registro de producción, calificación territorial, inspección inicial).
Mantener a mano la lista de "qué preguntar dónde" es exactamente el error que
provocó C-01, así que se deriva del motor en vez de duplicarse.

Ejecutar tras cualquier cambio en las condiciones de motor_normativo/reglas/:

    python3 scripts/generar_campos_condicionales.py

No editar apps/web/content/campos_condicionales.ts a mano: se sobrescribe.
El test apps/api/tests/test_contrato_frontend.py falla si queda desactualizado.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REGLAS_DIR = ROOT / "apps" / "api" / "motor_normativo" / "reglas"
SALIDA = ROOT / "apps" / "web" / "content" / "campos_condicionales.ts"

# Campos que el formulario pregunta siempre (o que decide por su cuenta con su
# propia lógica de pasos), así que no tiene sentido incluirlos en el mapa.
CAMPOS_BASE = {
    "tipo_instalacion",
    "comunidad",
    "potencia_kw",
    "uso",
    "solicita_ayuda",
}

# Variables que el clasificador inyecta al normalizar; no vienen del formulario.
CAMPOS_INTERNOS = {"_conflicto_tension", "_falta_tension"}


def variables_de(nodo, acumulador: set[str]) -> None:
    if isinstance(nodo, dict):
        for clave, valor in nodo.items():
            if clave == "var":
                nombre = valor[0] if isinstance(valor, list) and valor else valor
                if isinstance(nombre, str):
                    acumulador.add(nombre)
            variables_de(valor, acumulador)
    elif isinstance(nodo, list):
        for item in nodo:
            variables_de(item, acumulador)


def main() -> None:
    data: dict[str, dict[str, list[str]]] = {}
    for path in sorted(REGLAS_DIR.glob("*/*.json")):
        comunidad, tipo = path.parent.name, path.stem
        contenido = json.loads(path.read_text(encoding="utf-8"))

        usadas: set[str] = set()
        for regla in contenido.get("reglas", []):
            variables_de(regla.get("condicion"), usadas)
        for validacion in contenido.get("validaciones", []):
            variables_de(validacion.get("condicion"), usadas)

        relevantes = sorted(usadas - CAMPOS_BASE - CAMPOS_INTERNOS)
        data.setdefault(comunidad, {})[tipo] = relevantes

    lines = [
        "// GENERADO desde las condiciones json-logic de apps/api/motor_normativo/reglas/*/*.json",
        "// — no editar a mano. Regenerar con: python3 scripts/generar_campos_condicionales.py",
        "//",
        "// Para cada combinación comunidad x tecnología, los campos que las reglas de ESA",
        "// combinación usan realmente. El formulario pregunta solo esos: si una comunidad no",
        "// ramifica sobre 'uso_colectivo', no tiene sentido preguntarlo allí.",
        "//",
        "// Se genera en vez de mantenerse a mano porque mantener esta correspondencia a mano",
        "// es justo lo que provocó el hallazgo C-01 de la auditoría QA 2026-08-11: 9 campos",
        "// que las reglas usaban y el formulario nunca recogía, con json-logic evaluándolos",
        "// como falsy y dejando fuera trámites reales sin avisar.",
        "",
        "export const CAMPOS_CONDICIONALES: Record<string, Record<string, readonly string[]>> = {",
    ]
    for comunidad in sorted(data):
        lines.append(f"  {comunidad}: {{")
        for tipo in sorted(data[comunidad]):
            campos = ", ".join(json.dumps(c, ensure_ascii=False) for c in data[comunidad][tipo])
            lines.append(f"    {tipo}: [{campos}],")
        lines.append("  },")
    lines.append("};")
    lines.append("")
    lines.append("/** ¿Las reglas de esta comunidad y tecnología usan este campo? */")
    lines.append("export function campoAplica(")
    lines.append("  comunidad: string,")
    lines.append("  tipoInstalacion: string,")
    lines.append("  campo: string")
    lines.append("): boolean {")
    lines.append(
        "  return CAMPOS_CONDICIONALES[comunidad]?.[tipoInstalacion]?.includes(campo) ?? false;"
    )
    lines.append("}")
    lines.append("")

    SALIDA.write_text("\n".join(lines), encoding="utf-8")
    total = sum(len(campos) for v in data.values() for campos in v.values())
    print(f"Escrito {SALIDA} ({sum(len(v) for v in data.values())} combinaciones, {total} campos)")


if __name__ == "__main__":
    main()
