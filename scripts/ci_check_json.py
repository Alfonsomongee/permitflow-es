"""CLI para correr el linter de motor_normativo/reglas desde fuera de apps/api
(p.ej. un pre-commit hook o una ejecución manual desde la raíz del repo).

La lógica real vive en apps/api/motor_normativo/lint.py -- antes estaba
duplicada aquí, y esta copia solo hacía bloqueantes los hallazgos de Madrid y
Cataluña (el resto de comunidades quedaban como [WARN] sin fallar nunca, y el
script tampoco estaba conectado a ningún workflow de CI). Ahora
apps/api/tests/test_motor_normativo_lint.py corre el mismo chequeo, sobre las
85 comunidades por igual, dentro de `uv run pytest` (ver .github/workflows/ci.yml)
-- que es la vía real de enforcement. Este script queda como comodidad para
ejecutarlo suelto sin levantar pytest.
"""
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "apps" / "api"))

from motor_normativo.lint import lint_reglas_dir  # noqa: E402


def main() -> None:
    reglas_dir = REPO_ROOT / "apps" / "api" / "motor_normativo" / "reglas"
    hallazgos = lint_reglas_dir(reglas_dir)

    ficheros_con_hallazgos = sorted({h.fichero for h in hallazgos})
    total_ficheros = len(list(reglas_dir.rglob("*.json")))

    print("=== Motor normativo -- chequeo de coherencia (todas las CCAA) ===")
    for fichero in ficheros_con_hallazgos:
        print(f"[FAIL] {fichero}")
        for h in hallazgos:
            if h.fichero == fichero:
                print(f"  - {h.mensaje}")

    ok_count = total_ficheros - len(ficheros_con_hallazgos)
    print(f"\nFicheros comprobados: {total_ficheros}")
    print(f"Sin problemas: {ok_count}")
    print(f"Con problemas: {len(ficheros_con_hallazgos)}")
    print(f"Total hallazgos: {len(hallazgos)}")

    sys.exit(1 if hallazgos else 0)


if __name__ == "__main__":
    main()
