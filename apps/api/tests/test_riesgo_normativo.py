import pytest

from servicios.riesgo_normativo import calcular_riesgo_plan


def _tramite(**overrides):
    base = {
        "orden": 1,
        "nombre": "Trámite de prueba",
        "base_legal": "RD 1000/2020",
        "plazo_legal_dias": 30,
        "documentos_requeridos": ["dni"],
        "tipo_actuacion": "accion_usuario",
    }
    base.update(overrides)
    return base


def test_tramite_completo_con_normativa_verificada_es_bajo_riesgo():
    resultado = calcular_riesgo_plan([_tramite()], nivel_verificacion="verificada", estado=None)
    assert resultado.severidad_normativa == "verificada"
    assert resultado.tramites[0].riesgo == "bajo"
    assert resultado.hay_riesgo_alto is False


def test_normativa_generica_escala_todo_a_alto():
    resultado = calcular_riesgo_plan([_tramite()], nivel_verificacion="generica", estado=None)
    assert resultado.severidad_normativa == "critico"
    assert resultado.tramites[0].riesgo == "alto"
    assert resultado.hay_riesgo_alto is True


def test_estado_no_verificado_prima_sobre_nivel_generica_y_es_critico():
    resultado = calcular_riesgo_plan(
        [_tramite()], nivel_verificacion="generica", estado="borrador_no_verificado"
    )
    assert resultado.severidad_normativa == "critico"


def test_falta_base_legal_escala_a_alto_aunque_normativa_este_verificada():
    resultado = calcular_riesgo_plan(
        [_tramite(base_legal="")], nivel_verificacion="verificada", estado=None
    )
    assert resultado.tramites[0].riesgo == "alto"
    assert any("base legal" in m for m in resultado.tramites[0].motivos)


def test_falta_plazo_legal_escala_a_medio_no_a_alto():
    resultado = calcular_riesgo_plan(
        [_tramite(plazo_legal_dias=None)], nivel_verificacion="verificada", estado=None
    )
    assert resultado.tramites[0].riesgo == "medio"


def test_sin_documentos_requeridos_escala_a_medio_salvo_informativa():
    con_docs_vacios = calcular_riesgo_plan(
        [_tramite(documentos_requeridos=[])], nivel_verificacion="verificada", estado=None
    )
    assert con_docs_vacios.tramites[0].riesgo == "medio"

    informativa = calcular_riesgo_plan(
        [_tramite(documentos_requeridos=[], tipo_actuacion="informativa")],
        nivel_verificacion="verificada",
        estado=None,
    )
    assert informativa.tramites[0].riesgo == "bajo"


def test_resumen_cuenta_correctamente_por_nivel():
    tramites = [
        _tramite(orden=1),
        _tramite(orden=2, base_legal=""),
        _tramite(orden=3, plazo_legal_dias=None),
    ]
    resultado = calcular_riesgo_plan(tramites, nivel_verificacion="verificada", estado=None)
    assert resultado.resumen == {"bajo": 1, "medio": 1, "alto": 1}


def test_acepta_objetos_con_atributos_ademas_de_dicts():
    class FakeTramite:
        orden = 1
        nombre = "Trámite objeto"
        base_legal = "Ley 1/2021"
        plazo_legal_dias = 15
        documentos_requeridos = ["x"]
        tipo_actuacion = "accion_usuario"

    resultado = calcular_riesgo_plan([FakeTramite()], nivel_verificacion="verificada", estado=None)
    assert resultado.tramites[0].riesgo == "bajo"
