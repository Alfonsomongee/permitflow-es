import json

import pytest

from motor_normativo.clasificador import Clasificador
from motor_normativo.excepciones import NormativaNoEncontradaError
from motor_normativo.validador import Validador
from schemas.clasificador import ClasificadorInput


def _tramite(orden, nombre="Trámite", paralelo_con=None):
    return {
        "orden": orden, "nombre": f"{nombre} {orden}", "organismo": "Organismo X",
        "base_legal": "Norma Y", "plazo_estimado_dias": 10, "plazo_legal_dias": None,
        "documentos_requeridos": [], "notas": None, "plataforma": None,
        "paralelo_con": paralelo_con,
    }


@pytest.fixture
def reglas_dir(tmp_path):
    data = {
        "tipo_instalacion": "irve",
        "comunidad": "andalucia",
        "reglas": [
            {
                "id": "R1",
                "condicion": True,
                "tramites": [_tramite(1), _tramite(2, paralelo_con=1), _tramite(3)],
            },
            {
                "id": "R2",
                "condicion": {"==": [{"var": "solicita_ayuda"}, True]},
                "tramites": [_tramite(1, "Ayuda"), _tramite(2, "Ayuda", paralelo_con=1)],
            },
        ],
        "validaciones": [
            {
                "id": "VAL-ERR", "severidad": "error",
                "campos_requeridos": ["potencia_kw"],
                "condicion": {">": [{"var": "potencia_kw"}, 100]},
                "mensaje": "Potencia sospechosa", "fuente": "Test",
            },
            {
                "id": "VAL-SKIP", "severidad": "aviso",
                "campos_requeridos": ["potencia_por_punto_kw"],
                "condicion": {">": [{"var": "potencia_por_punto_kw"}, 0]},
                "mensaje": "No debe evaluarse sin dato",
            },
            {
                "id": "VAL-BROKEN", "severidad": "aviso",
                "campos_requeridos": [],
                "condicion": {"operacion_inexistente": [1, 2]},
                "mensaje": "Condición malformada",
            },
        ],
    }
    destino = tmp_path / "andalucia"
    destino.mkdir()
    (destino / "irve.json").write_text(
        json.dumps(data, ensure_ascii=False), encoding="utf-8"
    )
    return tmp_path


def _params(**overrides):
    base = dict(
        tipo_instalacion="irve", comunidad="andalucia", municipio="Sevilla",
        potencia_kw=22, uso="residencial", numero_puntos=2, modo_recarga="3",
        acceso_publico=False, ubicacion_irve="garaje_comunitario",
        requiere_nuevo_suministro=False, solicita_ayuda=True,
    )
    base.update(overrides)
    return ClasificadorInput(**base)


# ── Remapeo de paralelo_con en el motor aditivo ─────────────────────────────

def test_paralelo_con_remapeado_tras_fusion_aditiva(reglas_dir):
    clasificador = Clasificador()
    clasificador.reglas_dir = reglas_dir  # inyección de ruta para el test

    resultado = clasificador.clasificar(_params())
    assert len(resultado.tramites) == 5

    paralelos = [t.paralelo_con for t in resultado.tramites]
    # R1: [1→None, 2→par(1), 3→None] · R2 renumerada como [4→None, 5→par(4)]
    assert paralelos == [None, 1, None, None, 4], (
        f"El remapeo por regla del paralelo_con ha fallado: {paralelos}"
    )

    reglas_origen = [t.regla_id for t in resultado.tramites]
    assert reglas_origen == ["R1", "R1", "R1", "R2", "R2"], (
        f"regla_id no se propaga correctamente al output: {reglas_origen}"
    )


# ── Validador ────────────────────────────────────────────────────────────────

def test_validador_dispara_error(reglas_dir):
    salida = Validador(reglas_dir=reglas_dir).validar(_params(potencia_kw=150))
    ids = [h.id for h in salida.hallazgos]
    assert "VAL-ERR" in ids
    assert salida.total_errores == 1
    assert salida.total_definidas == 3


def test_validador_no_dispara_bajo_umbral(reglas_dir):
    salida = Validador(reglas_dir=reglas_dir).validar(_params(potencia_kw=50))
    assert all(h.id != "VAL-ERR" for h in salida.hallazgos)


def test_validador_omite_si_faltan_campos(reglas_dir):
    # potencia_por_punto_kw no se envía → VAL-SKIP no aplica ni cuenta como error
    salida = Validador(reglas_dir=reglas_dir).validar(_params())
    assert all(h.id != "VAL-SKIP" for h in salida.hallazgos)
    assert "VAL-SKIP" not in salida.no_evaluables


def test_validador_condicion_rota_va_a_no_evaluables(reglas_dir):
    salida = Validador(reglas_dir=reglas_dir).validar(_params())
    assert "VAL-BROKEN" in salida.no_evaluables


def test_validador_sin_clave_validaciones(reglas_dir):
    ruta = reglas_dir / "andalucia" / "irve.json"
    data = json.loads(ruta.read_text(encoding="utf-8"))
    del data["validaciones"]
    ruta.write_text(json.dumps(data), encoding="utf-8")

    salida = Validador(reglas_dir=reglas_dir).validar(_params())
    assert salida.total_definidas == 0
    assert salida.hallazgos == []


def test_validador_normativa_inexistente(reglas_dir):
    with pytest.raises(NormativaNoEncontradaError):
        Validador(reglas_dir=reglas_dir).validar(
            _params(tipo_instalacion="acs", potencia_kw=30)
        )
