#!/usr/bin/env python3
"""Detecta deriva entre supabase/migrations/ y lo aplicado en producción.

Motivación (auditoría 2026-08-23, AUD-07): dos migraciones commiteadas nunca
llegaron a aplicarse y nadie se enteró. `estadisticas_plazos` es la más cara:
la tabla no existe en producción, así que el cron semanal que la rellena falla
en cada ejecución y `lib/estadisticas.ts` devuelve vacío para siempre. Como el
código trataba ese vacío como "aún no hay muestra", el fallo era invisible.

El registro de verdad es `supabase_migrations.schema_migrations`, que solo se
rellena cuando la migración se aplica con la CLI de Supabase. Aplicarlas a mano
desde el editor SQL del panel NO deja rastro ahí: de ahí viene la deriva.

Dos direcciones, ambas problemáticas:

  - En el repo y sin aplicar  -> el código asume un esquema que no existe.
  - Aplicada y sin fichero    -> el esquema real no es reproducible desde git.

Sobre la línea base: hoy hay 12 discrepancias heredadas. Si el chequeo fallara
por todas ellas, estaría rojo desde el primer día y acabaría desactivado, que
es como mueren estos controles. Por eso solo falla ante deriva NUEVA, la que no
esté en supabase/migrations-baseline.txt. La línea base es deuda declarada: se
va vaciando según se reconcilia, y cada entrada dice por qué está ahí.

Uso:
    python scripts/check_migration_drift.py            # consulta la BD real
    python scripts/check_migration_drift.py --json     # salida procesable
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

# Nombre de fichero: <version>_<nombre>.sql, con la versión como timestamp.
PATRON_MIGRACION = re.compile(r"^(\d+)_(.+)\.sql$")

RAIZ_REPO = Path(__file__).resolve().parents[3]
DIR_MIGRACIONES = RAIZ_REPO / "supabase" / "migrations"
FICHERO_BASELINE = RAIZ_REPO / "supabase" / "migrations-baseline.txt"

CONSULTA_APLICADAS = (
    "select version || '|' || coalesce(name, '') "
    "from supabase_migrations.schema_migrations order by version"
)


@dataclass
class Drift:
    """Resultado de comparar repo contra base de datos."""

    sin_aplicar: dict[str, str] = field(default_factory=dict)
    sin_fichero: dict[str, str] = field(default_factory=dict)
    coinciden: dict[str, str] = field(default_factory=dict)
    # Deriva conocida y aceptada: se informa pero no rompe el build.
    heredado: dict[str, str] = field(default_factory=dict)

    @property
    def hay_deriva_nueva(self) -> bool:
        return bool(self.sin_aplicar or self.sin_fichero)


def versiones_en_repo(directorio: Path) -> dict[str, str]:
    """{version: nombre} a partir de los .sql del directorio de migraciones."""
    if not directorio.is_dir():
        return {}
    encontradas: dict[str, str] = {}
    for fichero in sorted(directorio.iterdir()):
        coincidencia = PATRON_MIGRACION.match(fichero.name)
        if coincidencia:
            encontradas[coincidencia.group(1)] = coincidencia.group(2)
    return encontradas


def leer_baseline(fichero: Path) -> set[str]:
    """Versiones exentas. Formato: una versión por línea, '#' comenta."""
    if not fichero.is_file():
        return set()
    versiones: set[str] = set()
    for linea in fichero.read_text(encoding="utf-8").splitlines():
        sin_comentario = linea.split("#", 1)[0].strip()
        if sin_comentario:
            versiones.add(sin_comentario)
    return versiones


def clasificar_drift(
    repo: dict[str, str], aplicadas: dict[str, str], baseline: set[str]
) -> Drift:
    """Compara ambos lados. Lógica pura: sin I/O, para poder testearla."""
    drift = Drift()
    for version in sorted(set(repo) | set(aplicadas)):
        en_repo, en_bd = version in repo, version in aplicadas
        nombre = repo.get(version) or aplicadas.get(version, "")
        if en_repo and en_bd:
            drift.coinciden[version] = nombre
        elif version in baseline:
            estado = "en el repo, sin aplicar" if en_repo else "aplicada, sin fichero"
            drift.heredado[version] = f"{nombre} ({estado})"
        elif en_repo:
            drift.sin_aplicar[version] = nombre
        else:
            drift.sin_fichero[version] = nombre
    return drift


def consultar_aplicadas(db_url: str) -> dict[str, str]:
    """Lee schema_migrations vía psql. Requiere la cadena de conexión."""
    try:
        salida = subprocess.run(
            ["psql", db_url, "-Atc", CONSULTA_APLICADAS],
            capture_output=True, text=True, check=True, timeout=60,
        ).stdout
    except FileNotFoundError:
        raise SystemExit("psql no está instalado y hace falta para consultar la BD.")
    except subprocess.CalledProcessError as exc:
        raise SystemExit(f"psql falló al consultar schema_migrations: {exc.stderr.strip()}")
    except subprocess.TimeoutExpired:
        raise SystemExit("Timeout consultando la base de datos (60s).")

    aplicadas: dict[str, str] = {}
    for linea in salida.splitlines():
        if "|" in linea:
            version, nombre = linea.split("|", 1)
            aplicadas[version.strip()] = nombre.strip()
    return aplicadas


def _informar(drift: Drift) -> None:
    print(f"Migraciones sincronizadas: {len(drift.coinciden)}")

    if drift.heredado:
        print(f"\nDeriva heredada y aceptada ({len(drift.heredado)}), en la línea base:")
        for version, detalle in drift.heredado.items():
            print(f"  · {version}  {detalle}")

    if drift.sin_aplicar:
        print(f"\nEN EL REPO Y SIN APLICAR ({len(drift.sin_aplicar)}):")
        for version, nombre in drift.sin_aplicar.items():
            print(f"  ✗ {version}_{nombre}.sql")
        print("  El código puede asumir un esquema que en producción no existe.")

    if drift.sin_fichero:
        print(f"\nAPLICADAS Y SIN FICHERO EN EL REPO ({len(drift.sin_fichero)}):")
        for version, nombre in drift.sin_fichero.items():
            print(f"  ✗ {version} {nombre}")
        print("  El esquema real no se puede reproducir desde git.")

    if not drift.hay_deriva_nueva:
        print("\nSin deriva nueva.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="salida en JSON")
    args = parser.parse_args()

    db_url = os.environ.get("SUPABASE_DB_URL", "").strip()
    if not db_url:
        print("SUPABASE_DB_URL no está definida: no se puede comprobar la deriva.")
        print("Es la cadena de conexión de Postgres (panel de Supabase > Database).")
        return 2

    drift = clasificar_drift(
        versiones_en_repo(DIR_MIGRACIONES),
        consultar_aplicadas(db_url),
        leer_baseline(FICHERO_BASELINE),
    )

    if args.json:
        print(json.dumps({
            "sin_aplicar": drift.sin_aplicar,
            "sin_fichero": drift.sin_fichero,
            "heredado": drift.heredado,
            "coinciden": len(drift.coinciden),
        }, indent=2, ensure_ascii=False))
    else:
        _informar(drift)

    return 1 if drift.hay_deriva_nueva else 0


if __name__ == "__main__":
    sys.exit(main())
