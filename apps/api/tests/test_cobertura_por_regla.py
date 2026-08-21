"""Un caso de prueba real por cada regla del motor normativo (302 reglas, 85
ficheros, 17 CCAA).

Origen: auditoría de testing 2026-08-20. Solo Madrid y Cataluña tenían tests
por `regla_id` (ver test_madrid_rules.py / test_cataluna_rules.py); las otras
15 CCAA solo estaban cubiertas por el barrido de "no revienta" de
test_motor_normativo_cobertura.py, que no confirma que el resultado sea
correcto ni siquiera que cada regla sea alcanzable.

Metodología: para cada regla con condición no trivial, se busca por
combinación acotada de valores (usando el dominio real de cada campo del
schema) un caso de entrada que la dispare, evaluando con la misma librería
`json_logic` que usa producción -- no una reimplementación propia, para no
repetir la deriva de tres evaluadores distintos que ya tiene el repo
(motor_normativo/validar_reglas.py). El caso encontrado se pasa por el
clasificador real (`Clasificador.clasificar`), no solo por `jsonLogic`
aislado, así que también ejercita las validaciones de entrada añadidas en
2026-08-20 (Legionela, IRVE, etc.).

Nota de rigor: la primera versión de esta búsqueda (auditoría del motor
normativo, misma fecha) marcó 9 reglas como "nunca dispara" que resultaron
ser falsos positivos por muestreo insuficiente -- todas verificadas a mano
antes de descartarlas. Aquí el límite de combinaciones es deliberadamente
alto (hasta 20000 por regla) para minimizar ese riesgo; aun así, si este test
falla para una regla concreta, el primer paso es verificar a mano con
jsonLogic() antes de asumir que la regla está realmente rota (puede ser el
buscador, no la regla -- ver el propio historial de este fichero).
"""
import itertools
import json
import pathlib

import pytest
from json_logic import jsonLogic

from motor_normativo.clasificador import Clasificador
from schemas.clasificador import ClasificadorInput

REGLAS_DIR = pathlib.Path(__file__).resolve().parents[1] / "motor_normativo" / "reglas"

# ─── Dominio de valores por campo (para la búsqueda de un caso positivo) ────
DOMINIO = {
    "potencia_kw": [0.5, 2, 3, 4.999, 5, 5.001, 10, 15, 20, 30, 50, 70, 100, 250, 500, 1000],
    "uso": ["residencial", "terciario", "industrial"],
    "modalidad": ["nueva", "ampliacion", "modificacion", "legalizacion", None],
    "tension": ["BT", "AT"],
    "modalidad_autoconsumo": [
        "sin_excedentes", "con_excedentes_sin_compensacion",
        "con_excedentes_con_compensacion",
    ],
    "acceso_publico": [True, False],
    "requiere_nuevo_suministro": [True, False],
    "solicita_ayuda": [True, False],
    "inversion_eur": [0, 5000, 6010.12, 6010.13, 60000, 60001, 400000, 700000, None],
    "numero_puntos": [1, 2, 10, 20],
    "potencia_por_punto_kw": [3.7, 7.4, 11, 22, 50, 150],
    "modo_recarga": ["1", "2", "3", "4"],
    "ubicacion_irve": ["interior", "exterior", "garaje_comunitario", "via_publica"],
    "combustible": ["gas_natural", "glp_deposito", "glp_envases"],
    "presion_bar": ["normal", "5+"],
    "implantacion": ["cubierta", "suelo", "interior", "exterior", "via_publica", "marquesina", "fachada"],
    "superficie_m2": [0, 10, 50, 100, 500],
    "acumulacion": [True, False],
    "recirculacion": [True, False],
    "uso_colectivo": [True, False],
    "instalacion_origen_modificada": [True, False],
    "incluida_ambito_rd_487_2022": [True, False],
    "nivel_tension_consumidor": ["bt", "at"],
    "nivel_tension_generacion": ["bt", "at"],
    "nivel_tension_conexion": ["bt", "at"],
    "clase_instalacion_gas": ["individual", "comun", "conexion_servicio"],
    "presion_operacion_bar": [0.02, 0.04, 0.05, 4, 4.999, 5, 5.001, 6],
    "es_ampliacion": [True, False],
    # Sin 0: combinado con es_ampliacion=True lo rechaza el validador de
    # entrada (schemas/clasificador.py) por motivos ajenos a la regla que se
    # está probando -- 0% de incremento en una ampliación no es un dato real.
    "incremento_potencia_pct": [9.999, 10, 50],
    "potencia_resultante_kw": [10, 24, 34.999, 35, 49.999, 50, 70, 100],
    "presion_resultante_bar": [0.02, 0.04, 0.05, 4, 5, 6],
    "combustible_gas": ["gas_natural", "glp"],
    "garaje_sujeto_inspeccion_periodica": [True, False],
    "numero_suministros_edificio": [1, 10, 19, 20, 21],
    "requiere_inspeccion_inicial_oc": [True, False],
    "acs_centralizada": [True, False],
    "dispone_acumulacion": [True, False],
    "dispone_circuito_retorno": [True, False],
    "requiere_registro_produccion": [True, False],
    "incluida_ambito_legionella": [True, False],
    "uso_edificio": ["residencial", "no_residencial"],
    "ventilacion_garaje": ["natural", "forzada"],
    "numero_plazas_garaje": [1, 19, 20, 50],
    "garaje_existente": [True, False],
    "ubicacion_suelo": ["urbanizado", "no_urbanizable"],
    "requiere_acceso_conexion": [True, False],
    "tipo_generador_acs": [
        "calentador_instantaneo", "calentador_acumulador", "termo_electrico",
        "sistema_solar_prefabricado", "caldera", "bomba_calor", "otro",
    ],
}

# Campos obligatorios (2026-08-20) que hay que rellenar para que
# ClasificadorInput no falle por un motivo AJENO a la regla que se está
# probando. Igual que en schemas/clasificador.py::validate_inputs_by_ca.
REQUERIDOS_POR_COMBO = {
    ("aragon", "acs"): {"uso_colectivo": False},
    ("baleares", "acs"): {"uso_colectivo": False},
    ("castilla_leon", "acs"): {"uso_colectivo": False},
    ("pais_vasco", "acs"): {"uso_colectivo": False},
    ("andalucia", "acs"): {"uso_colectivo": False},
    ("asturias", "acs"): {"acs_centralizada": False},
    ("canarias", "acs"): {"incluida_ambito_rd_487_2022": False},
    ("madrid", "acs"): {"incluida_ambito_rd_487_2022": False},
    ("canarias", "fotovoltaica_autoconsumo"): {"implantacion": "cubierta"},
    ("madrid", "gas_baja_presion"): {
        "potencia_resultante_kw": 20, "presion_resultante_bar": 0.05,
    },
    ("cataluna", "gas_baja_presion"): {
        "potencia_resultante_kw": 20, "presion_resultante_bar": 0.05,
    },
    ("cataluna", "fotovoltaica_autoconsumo"): {
        "modalidad_autoconsumo": "con_excedentes_con_compensacion",
        "ubicacion_suelo": "urbanizado", "requiere_acceso_conexion": False,
    },
    ("cataluna", "acs"): {
        "acs_centralizada": False, "incluida_ambito_legionella": False,
    },
    ("cataluna", "irve"): {
        "uso_edificio": "no_residencial", "ventilacion_garaje": "natural",
        "numero_plazas_garaje": 10, "garaje_existente": True,
    },
}

BASE = dict(
    potencia_kw=10, uso="residencial",
    modo_recarga="3", ubicacion_irve="exterior",
    numero_puntos=2, potencia_por_punto_kw=7.4,
    tension="BT",
    combustible="gas_natural", presion_bar="normal",
)


def _vars_de(cond, acc=None):
    acc = set() if acc is None else acc
    if isinstance(cond, dict):
        for op, args in cond.items():
            if op == "var":
                nombre = args if isinstance(args, str) else (args[0] if args else None)
                if nombre:
                    acc.add(nombre)
            else:
                for a in (args if isinstance(args, list) else [args]):
                    _vars_de(a, acc)
    elif isinstance(cond, list):
        for a in cond:
            _vars_de(a, acc)
    return acc


def _presion_normalizada(valor):
    if valor == "normal":
        return 0.0
    if valor == "5+":
        return 6.0
    return valor


def _buscar_caso_positivo(condicion, comunidad, tipo_instalacion, limite=20000):
    """Devuelve un dict de overrides que hace jsonLogic(condicion, ...)==True,
    o None si no se encontró ninguno dentro del límite de combinaciones."""
    variables = _vars_de(condicion) & set(DOMINIO.keys())
    ctx = {"tipo_instalacion": tipo_instalacion, "comunidad": comunidad}
    if not variables:
        return {}
    campos = sorted(variables)
    listas = [DOMINIO[c] for c in campos]
    total = 1
    for l in listas:
        total *= len(l)
    combos = itertools.islice(itertools.product(*listas), limite) if total > limite else itertools.product(*listas)
    for combo in combos:
        caso = dict(ctx)
        for c, v in zip(campos, combo):
            caso[c] = v
        eval_ctx = dict(caso)
        if "presion_bar" in eval_ctx:
            eval_ctx["presion_bar"] = _presion_normalizada(eval_ctx["presion_bar"])
        try:
            if jsonLogic(condicion, eval_ctx):
                return caso
        except Exception:
            continue
    return None


def _casos():
    resultado = []
    for fichero in sorted(REGLAS_DIR.glob("*/*.json")):
        data = json.loads(fichero.read_text(encoding="utf-8"))
        comunidad, tipo = data["comunidad"], data["tipo_instalacion"]
        for regla in data.get("reglas", []):
            condicion = regla.get("condicion", True)
            if condicion is False:
                continue  # desactivada a propósito (ver el propio JSON) -- no se prueba alcanzabilidad
            resultado.append((comunidad, tipo, regla["id"], condicion))
    return resultado


CASOS = _casos()


@pytest.mark.parametrize(
    "comunidad,tipo,regla_id,condicion",
    CASOS,
    ids=[f"{c}-{t}-{r}" for c, t, r, _ in CASOS],
)
def test_regla_es_alcanzable_por_el_clasificador_real(comunidad, tipo, regla_id, condicion):
    if condicion is True:
        overrides = {}
    else:
        overrides = _buscar_caso_positivo(condicion, comunidad, tipo)
        assert overrides is not None, (
            f"{comunidad}/{tipo}::{regla_id}: no se encontró ninguna combinación de "
            f"parámetros (dentro del dominio probado) que dispare esta regla. "
            f"Verifica a mano con jsonLogic() antes de asumir que es un bug real: "
            f"puede ser que la búsqueda no cubra la combinación exacta necesaria."
        )

    datos = dict(BASE)
    datos.update(REQUERIDOS_POR_COMBO.get((comunidad, tipo), {}))
    datos.update(overrides)
    datos["comunidad"] = comunidad
    datos["tipo_instalacion"] = tipo
    if "nivel_tension_conexion" in overrides:
        # BASE fija tension="BT"; si el caso encontrado necesita AT, hay que
        # alinear el campo grueso o Clasificador._normalizar_fotovoltaica
        # detecta un conflicto y desvía a "revisión manual" en vez de evaluar
        # la regla real (mismo mecanismo que M-01, ver clasificador.py).
        datos["tension"] = overrides["nivel_tension_conexion"].upper()

    params = ClasificadorInput(**datos)
    resultado = Clasificador().clasificar(params)
    ids_disparados = {t.regla_id for t in resultado.tramites}
    assert regla_id in ids_disparados, (
        f"{comunidad}/{tipo}::{regla_id}: la condición se evaluó a True de forma "
        f"aislada, pero el clasificador real no incluyó esta regla en el plan "
        f"(datos={datos})."
    )
