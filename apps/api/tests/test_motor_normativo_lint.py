import json
from pathlib import Path

from motor_normativo.lint import lint_reglas_dir

REGLAS_DIR = Path(__file__).resolve().parent.parent / "motor_normativo" / "reglas"


def test_no_hay_hallazgos_de_coherencia_en_los_ficheros_reales():
    """Corre el linter sobre los 85 JSON reales de motor_normativo/reglas.

    Si esto falla, el mensaje de assert lista fichero + regla + problema
    exacto -- no hace falta ir a buscar con qué comunidad/vertical fue.
    """
    hallazgos = lint_reglas_dir(REGLAS_DIR)
    if hallazgos:
        detalle = "\n".join(f"  - {h}" for h in hallazgos)
        raise AssertionError(
            f"{len(hallazgos)} problema(s) de coherencia en motor_normativo/reglas:\n{detalle}"
        )


def test_detecta_tramite_duplicado_dentro_de_la_misma_regla(tmp_path):
    """Regression test del bug real de AND-FV-003 (Andalucía repetía la
    'Solicitud del CAU' dos veces dentro de una misma regla). Se reproduce
    en un fixture aislado para no depender de que ninguno de los ficheros
    reales conserve el bug -- la aserción de arriba ya los deja limpios."""
    (tmp_path / "andalucia").mkdir()
    (tmp_path / "andalucia" / "fotovoltaica_autoconsumo.json").write_text(
        json.dumps({
            "reglas": [{
                "id": "AND-FV-003",
                "condicion": {"==": [1, 1]},
                "tramites": [
                    {"orden": 1, "nombre": "Solicitud del CAU"},
                    {"orden": 2, "nombre": "Comunicación PRTR"},
                    {"orden": 3, "nombre": "Solicitud del CAU"},
                ],
            }],
        }),
        encoding="utf-8",
    )

    hallazgos = lint_reglas_dir(tmp_path)

    assert len(hallazgos) == 1
    assert "trámite duplicado 'Solicitud del CAU'" in hallazgos[0].mensaje


def test_detecta_orden_repetido_dentro_de_la_misma_regla(tmp_path):
    (tmp_path / "madrid").mkdir()
    (tmp_path / "madrid" / "irve.json").write_text(
        json.dumps({
            "reglas": [{
                "id": "MAD-IRVE-001",
                "condicion": {"==": [1, 1]},
                "tramites": [
                    {"orden": 1, "nombre": "Trámite A"},
                    {"orden": 1, "nombre": "Trámite B"},
                ],
            }],
        }),
        encoding="utf-8",
    )

    hallazgos = lint_reglas_dir(tmp_path)

    assert len(hallazgos) == 1
    assert "orden 1 repetido" in hallazgos[0].mensaje


def test_detecta_regla_id_duplicado_en_el_mismo_fichero(tmp_path):
    (tmp_path / "galicia").mkdir()
    (tmp_path / "galicia" / "acs.json").write_text(
        json.dumps({
            "reglas": [
                {"id": "GAL-ACS-001", "condicion": {}, "tramites": []},
                {"id": "GAL-ACS-001", "condicion": {}, "tramites": []},
            ],
        }),
        encoding="utf-8",
    )

    hallazgos = lint_reglas_dir(tmp_path)

    assert any("ID de regla duplicado" in h.mensaje for h in hallazgos)


def test_detecta_regla_id_de_tramite_que_no_existe_en_el_fichero(tmp_path):
    (tmp_path / "murcia").mkdir()
    (tmp_path / "murcia" / "gas_baja_presion.json").write_text(
        json.dumps({
            "reglas": [{
                "id": "MUR-GAS-001",
                "condicion": {},
                "tramites": [
                    {"orden": 1, "nombre": "Trámite huérfano", "regla_id": "NO-EXISTE"},
                ],
            }],
        }),
        encoding="utf-8",
    )

    hallazgos = lint_reglas_dir(tmp_path)

    assert any("regla_id inválido" in h.mensaje for h in hallazgos)


def test_json_malformado_se_reporta_como_hallazgo_no_como_excepcion(tmp_path):
    (tmp_path / "canarias").mkdir()
    (tmp_path / "canarias" / "irve.json").write_text("{ esto no es json válido", encoding="utf-8")

    hallazgos = lint_reglas_dir(tmp_path)

    assert len(hallazgos) == 1
    assert "Error de parseo JSON" in hallazgos[0].mensaje


def test_ficheros_que_empiezan_por_guion_bajo_se_ignoran(tmp_path):
    (tmp_path / "_plantilla.json").write_text("{ invalido", encoding="utf-8")

    hallazgos = lint_reglas_dir(tmp_path)

    assert hallazgos == []


def test_detecta_valor_de_enum_imposible(tmp_path):
    """Regresión de la auditoría QA 2026-08-11 (parte de M-02).

    Dos reglas reales comparaban contra valores que el schema no puede
    producir: `uso == "comercial"` (el enum solo tiene residencial, terciario e
    industrial) y `combustible == "gas"`. json-logic no da error en ese caso —
    la condición evalúa a falso siempre— así que la rama quedaba muerta sin que
    nada lo señalase. En Canarias eso hacía que el uso terciario de gas
    devolviera un 404 de "sin normativa verificada".
    """
    (tmp_path / "canarias").mkdir()
    (tmp_path / "canarias" / "gas_baja_presion.json").write_text(
        json.dumps({
            "reglas": [{
                "id": "ICAN-GBP-001",
                "condicion": {"==": [{"var": "uso"}, "comercial"]},
                "tramites": [{"orden": 1, "nombre": "Comunicación"}],
            }],
        }),
        encoding="utf-8",
    )
    hallazgos = lint_reglas_dir(tmp_path)
    assert any("Valor imposible" in h.mensaje and "comercial" in h.mensaje for h in hallazgos)


def test_no_marca_los_valores_validos_del_enum(tmp_path):
    (tmp_path / "madrid").mkdir()
    (tmp_path / "madrid" / "acs.json").write_text(
        json.dumps({
            "reglas": [{
                "id": "MAD-ACS-001",
                "condicion": {"or": [
                    {"==": [{"var": "uso"}, "terciario"]},
                    {"==": [{"var": "modo_recarga"}, "3"]},
                ]},
                "tramites": [{"orden": 1, "nombre": "Registro"}],
            }],
        }),
        encoding="utf-8",
    )
    assert [h for h in lint_reglas_dir(tmp_path) if "Valor imposible" in h.mensaje] == []


def test_los_enums_del_linter_coinciden_con_el_schema():
    """El linter declara los valores admisibles en vez de importarlos, para poder
    correr sin arrancar el backend. Este test evita que ambas listas se separen."""
    import typing

    from motor_normativo.lint import VALORES_ENUM
    from schemas.clasificador import ClasificadorInput

    for campo, esperados in VALORES_ENUM.items():
        info = ClasificadorInput.model_fields.get(campo)
        assert info is not None, f"El linter valida '{campo}', que no existe en el schema"

        anotacion = info.annotation
        # Optional[Literal[...]] -> se recorre la unión buscando el Literal
        candidatos = typing.get_args(anotacion) or (anotacion,)
        reales: set[str] = set()
        for candidato in candidatos:
            if typing.get_origin(candidato) is typing.Literal:
                reales.update(typing.get_args(candidato))
        if typing.get_origin(anotacion) is typing.Literal:
            reales.update(typing.get_args(anotacion))

        assert reales == esperados, (
            f"'{campo}': el linter admite {sorted(esperados)} y el schema "
            f"{sorted(reales)}. Actualiza VALORES_ENUM en motor_normativo/lint.py."
        )
