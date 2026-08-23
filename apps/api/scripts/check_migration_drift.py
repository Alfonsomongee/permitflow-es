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
DIR_ALEMBIC = RAIZ_REPO / "apps" / "api" / "alembic" / "versions"

CONSULTA_APLICADAS = (
    "select version || '|' || coalesce(name, '') "
    "from supabase_migrations.schema_migrations order by version"
)
CONSULTA_ALEMBIC = "select version_num from alembic_version"

# Alembic declara la revisión de dos formas según la versión de la plantilla:
#   revision = "abc123"            (plantilla clásica)
#   revision: str = "abc123"       (plantilla con anotaciones de tipo)
PATRON_REVISION = re.compile(r"^revision(?::\s*[^=]+)?\s*=\s*['\"]([^'\"]+)['\"]", re.M)
PATRON_DOWN_REVISION = re.compile(
    r"^down_revision(?::\s*[^=]+)?\s*=\s*(?:['\"]([^'\"]+)['\"]|None)", re.M
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


@dataclass
class EstadoAlembic:
    """Comparación entre la cadena de revisiones del repo y alembic_version.

    Alembic es la mitad sana del sistema (se aplica sola y se registra bien),
    pero precisamente por eso nadie la vigila: si el despliegue que ejecuta
    `alembic upgrade head` falla, producción se queda atrás en silencio.
    """

    estado: str
    cabezas: set[str] = field(default_factory=set)
    version_produccion: str | None = None
    total_revisiones: int = 0

    @property
    def hay_problema(self) -> bool:
        return self.estado != "al_dia"

    @property
    def mensaje(self) -> str:
        if self.estado == "al_dia":
            return f"Alembic al día en {self.version_produccion} ({self.total_revisiones} revisiones)."
        if self.estado == "sin_revisiones":
            return "No se han encontrado revisiones de Alembic en el repo."
        if self.estado == "multiples_cabezas":
            return (
                f"Alembic tiene {len(self.cabezas)} cabezas: {', '.join(sorted(self.cabezas))}. "
                "La cadena se ha bifurcado y `upgrade head` fallará; hay que fusionarlas."
            )
        if self.estado == "produccion_atrasada":
            return (
                f"Producción está en {self.version_produccion}, pero la cabeza del repo es "
                f"{', '.join(sorted(self.cabezas))}: faltan migraciones por aplicar."
            )
        if self.estado == "produccion_desconocida":
            return (
                f"Producción declara la revisión {self.version_produccion}, que no existe en "
                "el repo. O se borró un fichero de migración, o la base de datos no es la que "
                "este repo cree."
            )
        return f"Estado no reconocido: {self.estado}"


def revisiones_alembic(directorio: Path) -> dict[str, str | None]:
    """{revision: down_revision} leyendo los ficheros de alembic/versions."""
    if not directorio.is_dir():
        return {}
    cadena: dict[str, str | None] = {}
    for fichero in sorted(directorio.glob("*.py")):
        texto = fichero.read_text(encoding="utf-8")
        revision = PATRON_REVISION.search(texto)
        if not revision:
            continue
        down = PATRON_DOWN_REVISION.search(texto)
        cadena[revision.group(1)] = down.group(1) if down else None
    return cadena


def cabezas_alembic(cadena: dict[str, str | None]) -> set[str]:
    """Revisiones a las que nadie apunta como padre: las cabezas de la cadena."""
    padres = {padre for padre in cadena.values() if padre}
    return set(cadena) - padres


def comparar_alembic(cadena: dict[str, str | None], version_produccion: str | None) -> EstadoAlembic:
    """Lógica pura: contrasta la cadena del repo con lo que declara producción."""
    if not cadena:
        return EstadoAlembic("sin_revisiones", version_produccion=version_produccion)

    cabezas = cabezas_alembic(cadena)
    comun = dict(cabezas=cabezas, version_produccion=version_produccion,
                 total_revisiones=len(cadena))

    if len(cabezas) > 1:
        return EstadoAlembic("multiples_cabezas", **comun)
    if version_produccion in cabezas:
        return EstadoAlembic("al_dia", **comun)
    if version_produccion in cadena:
        return EstadoAlembic("produccion_atrasada", **comun)
    return EstadoAlembic("produccion_desconocida", **comun)


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


def _psql(db_url: str, consulta: str) -> str:
    try:
        return subprocess.run(
            ["psql", db_url, "-Atc", consulta],
            capture_output=True, text=True, check=True, timeout=60,
        ).stdout
    except FileNotFoundError:
        raise SystemExit("psql no está instalado y hace falta para consultar la BD.")
    except subprocess.CalledProcessError as exc:
        raise SystemExit(f"psql falló: {exc.stderr.strip()}")
    except subprocess.TimeoutExpired:
        raise SystemExit("Timeout consultando la base de datos (60s).")


def consultar_version_alembic(db_url: str) -> str | None:
    """Revisión declarada por alembic_version, o None si la tabla no existe."""
    salida = _psql(db_url, CONSULTA_ALEMBIC).strip()
    return salida.splitlines()[0].strip() if salida else None


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


def _informar(drift: Drift, alembic: EstadoAlembic | None = None) -> None:
    if alembic is not None:
        marca = "·" if not alembic.hay_problema else "✗"
        print(f"[Alembic]  {marca} {alembic.mensaje}\n")

    print("[Supabase SQL]")
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
    alembic = comparar_alembic(
        revisiones_alembic(DIR_ALEMBIC), consultar_version_alembic(db_url)
    )

    if args.json:
        print(json.dumps({
            "alembic": {
                "estado": alembic.estado,
                "version_produccion": alembic.version_produccion,
                "cabezas": sorted(alembic.cabezas),
            },
            "sin_aplicar": drift.sin_aplicar,
            "sin_fichero": drift.sin_fichero,
            "heredado": drift.heredado,
            "coinciden": len(drift.coinciden),
        }, indent=2, ensure_ascii=False))
    else:
        _informar(drift, alembic)

    return 1 if (drift.hay_deriva_nueva or alembic.hay_problema) else 0


if __name__ == "__main__":
    sys.exit(main())
