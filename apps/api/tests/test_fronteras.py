import json
import warnings
from pathlib import Path
import pytest
from pydantic import ValidationError

from motor_normativo.clasificador import Clasificador
from motor_normativo.excepciones import NormativaNoEncontradaError
from schemas.clasificador import ClasificadorInput

REGLAS_DIR = Path(__file__).parent.parent / "motor_normativo" / "reglas"
CASOS_DIR = Path(__file__).parent / "casos_referencia"

# Campos numéricos que el motor compara con desigualdades, y el paso adecuado.
# bool excluido porque es subclase de int pero no es un campo numérico real.
CAMPOS_NUMERICOS = {
    "potencia_kw": 0.5,
    "superficie_m2": 0.5,
    "potencia_por_punto_kw": 0.1,
    "numero_puntos": 1,
}

def extraer_umbrales(condicion: dict, var_objetivo: str) -> list[float]:
    umbrales = []
    def _walk(node):
        if isinstance(node, dict):
            for op, args in node.items():
                if op in ("<=", "<", ">=", ">") and isinstance(args, list) and len(args) == 2:
                    var_ref = args[0].get("var") if isinstance(args[0], dict) else None
                    valor = args[1]
                    if (
                        var_ref == var_objetivo
                        and isinstance(valor, (int, float))
                        and not isinstance(valor, bool)  # bool es subclase de int
                    ):
                        umbrales.append(valor)
                for a in (args if isinstance(args, list) else []):
                    _walk(a)
    _walk(condicion)
    return sorted(set(umbrales))

def generar_casos_frontera(umbral: float, campo: str) -> list[float]:
    paso = CAMPOS_NUMERICOS.get(campo, 1)
    return [umbral - paso, umbral, umbral + paso]

def assert_sin_duplicados(resultado):
    nombres = [t.nombre for t in resultado.tramites]
    duplicados = {n for n in nombres if nombres.count(n) > 1}
    assert not duplicados, f"Trámite duplicado en frontera: {duplicados}"

def get_base_inputs():
    """Devuelve un diccionario {(comunidad, tipo_instalacion): input_base_dict}"""
    base_inputs = {}
    for p in sorted(CASOS_DIR.glob("*.json")):
        datos = json.loads(p.read_text(encoding="utf-8"))
        inp = datos.get("input", {})
        if "comunidad" in inp and "tipo_instalacion" in inp:
            key = (inp["comunidad"], inp["tipo_instalacion"])
            if key not in base_inputs:
                base_inputs[key] = inp
    return base_inputs

def build_fronteras():
    casos_test = []
    base_inputs = get_base_inputs()

    # Recorrer todos los JSON de reglas para extraer fronteras
    for json_file in sorted(REGLAS_DIR.rglob("*.json")):
        if json_file.name == "_schema.json":
            continue

        data = json.loads(json_file.read_text(encoding="utf-8"))
        comunidad = data.get("comunidad")
        tipo_instalacion = data.get("tipo_instalacion")

        # Solo probamos verticales/CCAA para los que tenemos un input base validado
        base_input = base_inputs.get((comunidad, tipo_instalacion))
        if not base_input:
            continue

        for regla in data.get("reglas", []):
            condicion = regla.get("condicion", True)
            if not isinstance(condicion, dict):
                continue

            for campo in CAMPOS_NUMERICOS.keys():
                umbrales = extraer_umbrales(condicion, campo)
                for u in umbrales:
                    for v in generar_casos_frontera(u, campo):
                        if v < 0:
                            continue  # No probamos valores negativos físicos

                        nuevo_input = dict(base_input)
                        nuevo_input[campo] = v

                        casos_test.append({
                            "id": f"{comunidad}-{tipo_instalacion}-{campo}-{v}",
                            "input": nuevo_input,
                            "regla": regla.get("id", "unknown"),
                        })
    return casos_test

@pytest.fixture
def clasificador():
    return Clasificador()

@pytest.mark.parametrize("caso", build_fronteras(), ids=lambda c: c["id"])
def test_fronteras(caso, clasificador):
    """
    Verifica que en cada frontera numérica del motor:
      - si hay cobertura: no hay trámites duplicados ni errores de regla
      - si no hay cobertura (laguna): se registra como warning, no como fallo
    ValidationError indica un bug en el input base del caso de referencia → fallo duro.
    """
    try:
        resultado = clasificador.clasificar(ClasificadorInput(**caso["input"]))
        # Con cobertura: verificar integridad del resultado
        assert_sin_duplicados(resultado)
        assert not any("regla(s) del motor normativo" in w for w in resultado.advertencias), (
            f"Regla con error de evaluación en frontera {caso['id']}: "
            f"{[w for w in resultado.advertencias if 'regla(s)' in w]}"
        )
    except NormativaNoEncontradaError as e:
        # Laguna detectada: no hay regla que cubra este punto de frontera.
        # No es un fallo del test — es información útil para el equipo de normativa.
        warnings.warn(
            f"Laguna normativa en frontera [{caso['id']}] "
            f"(regla origen: {caso['regla']}): {e}",
            stacklevel=2,
        )
    # ValidationError no se captura → fallo duro: indica bug en el input base
