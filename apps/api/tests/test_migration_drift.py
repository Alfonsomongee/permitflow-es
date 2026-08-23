"""Tests de la lógica de detección de deriva de migraciones (AUD-07).

Se testea la lógica pura de los dos sistemas de migración que conviven sobre
la misma base de datos: `clasificar_drift` (Supabase SQL) y
`comparar_alembic` (Alembic). Las consultas a la base de datos
(`consultar_aplicadas`, `consultar_version_alembic`) no se cubren aquí:
necesitan psql y una conexión real, y su única responsabilidad es traducir
filas a un dict.
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from check_migration_drift import (  # noqa: E402
    cabezas_alembic,
    clasificar_drift,
    comparar_alembic,
    leer_baseline,
    revisiones_alembic,
    versiones_en_repo,
)


# ── versiones_en_repo ────────────────────────────────────────────────────────

def test_extrae_version_y_nombre_de_los_ficheros(tmp_path):
    (tmp_path / "20260710120000_tramites_estado.sql").write_text("")
    (tmp_path / "20260712090000_estadisticas_plazos.sql").write_text("")
    assert versiones_en_repo(tmp_path) == {
        "20260710120000": "tramites_estado",
        "20260712090000": "estadisticas_plazos",
    }


def test_ignora_ficheros_que_no_son_migraciones(tmp_path):
    (tmp_path / "20260710120000_ok.sql").write_text("")
    (tmp_path / "README.md").write_text("")
    (tmp_path / "sin_version.sql").write_text("")
    (tmp_path / "migrations-baseline.txt").write_text("")
    assert versiones_en_repo(tmp_path) == {"20260710120000": "ok"}


def test_directorio_inexistente_no_revienta(tmp_path):
    assert versiones_en_repo(tmp_path / "no_existe") == {}


# ── leer_baseline ────────────────────────────────────────────────────────────

def test_baseline_ignora_comentarios_y_lineas_vacias(tmp_path):
    fichero = tmp_path / "baseline.txt"
    fichero.write_text(
        "# cabecera\n"
        "\n"
        "20260710120000   # tramites_estado\n"
        "   \n"
        "20260723100000\n"
        "# 20260712090000 comentada entera: NO debe contar\n",
        encoding="utf-8",
    )
    assert leer_baseline(fichero) == {"20260710120000", "20260723100000"}


def test_baseline_inexistente_es_conjunto_vacio(tmp_path):
    assert leer_baseline(tmp_path / "no_existe.txt") == set()


# ── clasificar_drift ─────────────────────────────────────────────────────────

def test_migracion_en_ambos_lados_esta_sincronizada():
    drift = clasificar_drift({"1": "a"}, {"1": "a"}, set())
    assert drift.coinciden == {"1": "a"}
    assert not drift.hay_deriva_nueva


def test_en_repo_y_sin_aplicar_es_deriva():
    drift = clasificar_drift({"1": "estadisticas_plazos"}, {}, set())
    assert drift.sin_aplicar == {"1": "estadisticas_plazos"}
    assert drift.hay_deriva_nueva


def test_aplicada_y_sin_fichero_es_deriva():
    drift = clasificar_drift({}, {"1": "add_newsletter"}, set())
    assert drift.sin_fichero == {"1": "add_newsletter"}
    assert drift.hay_deriva_nueva


def test_la_baseline_degrada_la_deriva_a_heredada_sin_romper():
    drift = clasificar_drift({"1": "vieja"}, {}, {"1"})
    assert drift.sin_aplicar == {}
    assert "1" in drift.heredado
    assert not drift.hay_deriva_nueva


def test_la_baseline_cubre_las_dos_direcciones():
    drift = clasificar_drift({}, {"1": "aplicada_sin_fichero"}, {"1"})
    assert drift.sin_fichero == {}
    assert not drift.hay_deriva_nueva


def test_la_baseline_distingue_la_direccion_en_el_detalle():
    solo_repo = clasificar_drift({"1": "x"}, {}, {"1"})
    solo_bd = clasificar_drift({}, {"1": "x"}, {"1"})
    assert "sin aplicar" in solo_repo.heredado["1"]
    assert "sin fichero" in solo_bd.heredado["1"]


def test_una_migracion_sincronizada_ignora_la_baseline():
    # Estar en la línea base no debe ocultarla del recuento de sincronizadas
    # si en realidad está en ambos lados.
    drift = clasificar_drift({"1": "a"}, {"1": "a"}, {"1"})
    assert drift.coinciden == {"1": "a"}
    assert drift.heredado == {}


def test_deriva_nueva_rompe_aunque_haya_heredada():
    drift = clasificar_drift(
        {"1": "vieja", "2": "nueva_sin_aplicar"}, {}, {"1"}
    )
    assert drift.sin_aplicar == {"2": "nueva_sin_aplicar"}
    assert drift.hay_deriva_nueva


def test_caso_real_del_repo_el_2026_08_23():
    """Reproduce el estado verificado en producción el día de la auditoría."""
    repo = {
        "20260710120000": "tramites_estado",
        "20260712090000": "estadisticas_plazos",
        "20260806120000": "rls_aislamiento_multi_tenant",
        "20260808080130": "rls_tablas_restantes_y_limpieza_grants",
        "20260822090000": "fase_comercial",
    }
    aplicadas = {
        "20260808075847": "rls_aislamiento_multi_tenant",
        "20260808080130": "rls_tablas_restantes_y_limpieza_grants",
        "20260809090457": "add_newsletter_suscriptores",
    }
    baseline = {
        "20260710120000", "20260806120000", "20260808075847",
        "20260809090457", "20260822090000",
    }
    drift = clasificar_drift(repo, aplicadas, baseline)

    # estadisticas_plazos es el único fallo real: fuera de la línea base a
    # propósito, porque la tabla no existe en producción (AUD-04).
    assert drift.sin_aplicar == {"20260712090000": "estadisticas_plazos"}
    assert drift.sin_fichero == {}
    assert drift.coinciden == {
        "20260808080130": "rls_tablas_restantes_y_limpieza_grants"
    }
    assert drift.hay_deriva_nueva


# ── Alembic: parseo de la cadena de revisiones ───────────────────────────────

def _revision(tmp_path, nombre, revision, down):
    valor_down = "None" if down is None else f'"{down}"'
    (tmp_path / f"{nombre}.py").write_text(
        f'"""migracion de prueba."""\n'
        f'revision: str = "{revision}"\n'
        f'down_revision: Union[str, None] = {valor_down}\n',
        encoding="utf-8",
    )


def test_lee_la_cadena_con_plantilla_anotada(tmp_path):
    _revision(tmp_path, "a_base", "aaa", None)
    _revision(tmp_path, "b_sig", "bbb", "aaa")
    assert revisiones_alembic(tmp_path) == {"aaa": None, "bbb": "aaa"}


def test_lee_la_cadena_con_plantilla_clasica(tmp_path):
    (tmp_path / "vieja.py").write_text(
        'revision = "xxx"\ndown_revision = "www"\n', encoding="utf-8"
    )
    assert revisiones_alembic(tmp_path) == {"xxx": "www"}


def test_ignora_ficheros_sin_revision(tmp_path):
    (tmp_path / "__init__.py").write_text("", encoding="utf-8")
    _revision(tmp_path, "real", "aaa", None)
    assert revisiones_alembic(tmp_path) == {"aaa": None}


def test_la_cabeza_es_la_revision_a_la_que_nadie_apunta():
    cadena = {"aaa": None, "bbb": "aaa", "ccc": "bbb"}
    assert cabezas_alembic(cadena) == {"ccc"}


def test_una_cadena_bifurcada_tiene_dos_cabezas():
    cadena = {"aaa": None, "bbb": "aaa", "ccc": "aaa"}
    assert cabezas_alembic(cadena) == {"bbb", "ccc"}


# ── Alembic: comparación contra producción ───────────────────────────────────

def test_produccion_en_la_cabeza_esta_al_dia():
    estado = comparar_alembic({"aaa": None, "bbb": "aaa"}, "bbb")
    assert estado.estado == "al_dia"
    assert not estado.hay_problema


def test_produccion_en_una_revision_anterior_esta_atrasada():
    estado = comparar_alembic({"aaa": None, "bbb": "aaa"}, "aaa")
    assert estado.estado == "produccion_atrasada"
    assert estado.hay_problema
    assert "faltan migraciones" in estado.mensaje


def test_revision_de_produccion_que_no_existe_en_el_repo():
    estado = comparar_alembic({"aaa": None}, "desconocida")
    assert estado.estado == "produccion_desconocida"
    assert estado.hay_problema


def test_cadena_bifurcada_es_un_problema_aunque_produccion_coincida():
    # `alembic upgrade head` falla con varias cabezas: hay que detectarlo
    # aunque producción esté en una de ellas.
    estado = comparar_alembic({"aaa": None, "bbb": "aaa", "ccc": "aaa"}, "bbb")
    assert estado.estado == "multiples_cabezas"
    assert estado.hay_problema


def test_sin_revisiones_no_revienta():
    estado = comparar_alembic({}, None)
    assert estado.estado == "sin_revisiones"


def test_base_de_datos_sin_tabla_alembic_version():
    estado = comparar_alembic({"aaa": None, "bbb": "aaa"}, None)
    assert estado.estado == "produccion_desconocida"


def test_cadena_real_del_repo_el_2026_08_23():
    """La cadena real de apps/api/alembic/versions, con producción en head."""
    cadena = {
        "0519f21bbb78": None,
        "20d1d6d86896": "0519f21bbb78",
        "f322ac0b98a0": "20d1d6d86896",
        "a7b3c1d2e4f5": "f322ac0b98a0",
        "a0b0be4235c5": "a7b3c1d2e4f5",
        "fb6fce9be8d1": "a0b0be4235c5",
        "6b37eb0a1b9f": "fb6fce9be8d1",
        "b365d684e87c": "6b37eb0a1b9f",
        "8ff70755e4d7": "b365d684e87c",
        "c4d8e91a2b3f": "8ff70755e4d7",
        "d7e2f4a9c1b6": "c4d8e91a2b3f",
    }
    assert cabezas_alembic(cadena) == {"d7e2f4a9c1b6"}
    estado = comparar_alembic(cadena, "d7e2f4a9c1b6")
    assert estado.estado == "al_dia"
    assert estado.total_revisiones == 11
