"""
Tests para las reglas normativas de Cataluña.
Adaptados a la estructura v1.1.0 de los JSON (reglas aditivas, IDs nuevos).
"""
import json
import os
import sys

import pytest
from pydantic import ValidationError

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../apps/api")))

from json_logic import jsonLogic
from motor_normativo.clasificador import Clasificador
from schemas.clasificador import ClasificadorInput


# ─── Helpers ─────────────────────────────────────────────────────────────────

def load_rules(filename: str) -> dict:
    path = os.path.join(
        os.path.dirname(__file__),
        "../../apps/api/motor_normativo/reglas/cataluna",
        filename,
    )
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def validate_no_empty_keys(node, path=""):
    """Asegura que ninguna clave JSONLogic es la cadena vacía."""
    if isinstance(node, dict):
        if "" in node:
            raise ValueError(f"Clave operador vacía '' en {path}")
        for k, v in node.items():
            validate_no_empty_keys(v, path + f"/{k}")
    elif isinstance(node, list):
        for i, item in enumerate(node):
            validate_no_empty_keys(item, path + f"[{i}]")


def rule_condition(data: dict, rule_id: str):
    """Devuelve la condición JSONLogic de una regla por su id."""
    for rule in data["reglas"]:
        if rule["id"] == rule_id:
            return rule["condicion"]
    raise KeyError(f"Regla {rule_id!r} no encontrada")


# ─── 1. Integridad JSONLogic (todos los ficheros) ────────────────────────────

FILES = [
    "acs.json",
    "climatizacion_aerotermia.json",
    "gas_baja_presion.json",
    "irve.json",
    "fotovoltaica_autoconsumo.json",
]


def test_cataluna_jsonlogic_integrity():
    """No debe existir ninguna clave operador vacía en ningún JSON de Cataluña."""
    for filename in FILES:
        data = load_rules(filename)
        for rule in data.get("reglas", []):
            validate_no_empty_keys(rule.get("condicion", {}))
            for tramite in rule.get("tramites", []):
                for doc in tramite.get("documentos_requeridos", []):
                    if "condicion_documento" in doc:
                        validate_no_empty_keys(doc["condicion_documento"])


def test_cataluna_no_generic_canal_empresa_urls():
    """Las URLs de plataforma deben ser específicas, nunca la home genérica de Canal Empresa."""
    GENERIC = "https://canalempresa.gencat.cat"
    for filename in FILES:
        data = load_rules(filename)
        for rule in data.get("reglas", []):
            for tramite in rule.get("tramites", []):
                url = tramite.get("plataforma_url") or ""
                assert url != GENERIC, (
                    f"URL genérica detectada en {filename} / regla {rule['id']}: {url!r}"
                )


def test_cataluna_registro_salida_ritsic_when_organismo_empresa():
    """
    Los trámites con organismo 'Departament d'Empresa i Treball' que tienen
    plataforma definida deben tener registro_salida = RITSIC.
    """
    for filename in FILES:
        data = load_rules(filename)
        for rule in data.get("reglas", []):
            for tramite in rule.get("tramites", []):
                organismo = tramite.get("organismo", "")
                if "Empresa i Treball" in organismo and tramite.get("plataforma"):
                    rs = tramite.get("registro_salida")
                    assert rs == "RITSIC", (
                        f"Se esperaba RITSIC en {filename}/{rule['id']} "
                        f"organismo '{organismo}', encontrado: {rs!r}"
                    )


# ─── 2. ACS ──────────────────────────────────────────────────────────────────

def test_cataluna_acs_potencia_fronteras():
    data = load_rules("acs.json")
    r_info  = rule_condition(data, "CAT-ACS-INFO")
    r_mtd   = rule_condition(data, "CAT-ACS-MTD")
    r_proy  = rule_condition(data, "CAT-ACS-PROYECTO")
    r_legio = rule_condition(data, "CAT-ACS-LEGIONELLA")

    base = {"tipo_instalacion": "acs", "incluida_ambito_legionella": False}

    # < 5 kW → solo INFO
    for kw in (0.5, 4.9):
        ctx = {**base, "potencia_kw": kw}
        assert jsonLogic(r_info, ctx)  is True,  f"INFO debe actuar a {kw} kW"
        assert jsonLogic(r_mtd,  ctx) is False, f"MTD no debe actuar a {kw} kW"
        assert jsonLogic(r_proy, ctx) is False, f"PROYECTO no debe actuar a {kw} kW"

    # 5 kW → MTD (frontera inferior)
    ctx5 = {**base, "potencia_kw": 5.0}
    assert jsonLogic(r_info, ctx5)  is False
    assert jsonLogic(r_mtd,  ctx5) is True
    assert jsonLogic(r_proy, ctx5) is False

    # 69.9 kW → MTD
    ctx69 = {**base, "potencia_kw": 69.9}
    assert jsonLogic(r_mtd,  ctx69) is True
    assert jsonLogic(r_proy, ctx69) is False

    # 70 kW → PROYECTO (frontera superior MTD)
    ctx70 = {**base, "potencia_kw": 70.0}
    assert jsonLogic(r_mtd,  ctx70) is False
    assert jsonLogic(r_proy, ctx70) is True


def test_cataluna_acs_legionella():
    data = load_rules("acs.json")
    r_legio = rule_condition(data, "CAT-ACS-LEGIONELLA")
    base = {"tipo_instalacion": "acs"}

    assert jsonLogic(r_legio, {**base, "incluida_ambito_legionella": True})  is True
    assert jsonLogic(r_legio, {**base, "incluida_ambito_legionella": False}) is False


# ─── 3. Aerotermia ───────────────────────────────────────────────────────────

def test_cataluna_aerotermia_potencia_fronteras():
    data = load_rules("climatizacion_aerotermia.json")
    r_info = rule_condition(data, "CAT-AERO-INFO")
    r_mtd  = rule_condition(data, "CAT-AERO-MTD")
    r_proy = rule_condition(data, "CAT-AERO-PROYECTO")

    base = {"tipo_instalacion": "climatizacion_aerotermia"}

    # < 5 kW
    for kw in (1, 4.9):
        ctx = {**base, "potencia_kw": kw}
        assert jsonLogic(r_info, ctx) is True
        assert jsonLogic(r_mtd,  ctx) is False

    # 5 kW
    ctx5 = {**base, "potencia_kw": 5}
    assert jsonLogic(r_info, ctx5) is False
    assert jsonLogic(r_mtd,  ctx5) is True
    assert jsonLogic(r_proy, ctx5) is False

    # 70 kW
    ctx70 = {**base, "potencia_kw": 70}
    assert jsonLogic(r_mtd,  ctx70) is False
    assert jsonLogic(r_proy, ctx70) is True


# ─── 4. Gas ──────────────────────────────────────────────────────────────────

def test_cataluna_gas_alta_presion():
    """Presión > 5 bar → siempre proyecto, independientemente de la potencia."""
    data = load_rules("gas_baja_presion.json")
    r_ap = rule_condition(data, "CAT-GAS-PROYECTO-ALTA-PRESION")

    assert jsonLogic(r_ap, {"presion_resultante_bar": 5.1})  is True
    assert jsonLogic(r_ap, {"presion_resultante_bar": 5.0})  is False
    assert jsonLogic(r_ap, {"presion_resultante_bar": 10.0}) is True


def test_cataluna_gas_potencia_individual():
    """Individual > 70 kW + presión <= 5 bar → proyecto."""
    data = load_rules("gas_baja_presion.json")
    r = rule_condition(data, "CAT-GAS-PROYECTO-POTENCIA-INDIVIDUAL")

    ctx_ok = {
        "presion_resultante_bar": 0.1,
        "clase_instalacion_gas": "individual",
        "potencia_resultante_kw": 70.1,
    }
    assert jsonLogic(r, ctx_ok) is True

    # 70 kW exacto → no activa esta regla
    ctx_borde = {**ctx_ok, "potencia_resultante_kw": 70.0}
    assert jsonLogic(r, ctx_borde) is False

    # común no activa esta regla
    ctx_comun = {**ctx_ok, "clase_instalacion_gas": "comun"}
    assert jsonLogic(r, ctx_comun) is False


def test_cataluna_gas_potencia_comun():
    """Común o conexión_servicio > 2000 kW + presión <= 5 bar → proyecto."""
    data = load_rules("gas_baja_presion.json")
    r = rule_condition(data, "CAT-GAS-PROYECTO-COMUN")

    base = {"presion_resultante_bar": 0.1}

    for clase in ("comun", "conexion_servicio"):
        ctx_si = {**base, "clase_instalacion_gas": clase, "potencia_resultante_kw": 2001}
        ctx_no = {**base, "clase_instalacion_gas": clase, "potencia_resultante_kw": 2000}
        assert jsonLogic(r, ctx_si) is True,  f"{clase} >2000 debería activarse"
        assert jsonLogic(r, ctx_no) is False, f"{clase} =2000 no debería activarse"


def test_cataluna_gas_ampliacion():
    """Ampliación > 30% → proyecto."""
    data = load_rules("gas_baja_presion.json")
    r = rule_condition(data, "CAT-GAS-PROYECTO-AMPLIACION")

    base = {
        "presion_resultante_bar": 0.1,
        "clase_instalacion_gas": "individual",
        "potencia_resultante_kw": 30,
        "es_ampliacion": True,
        "incremento_potencia_pct": 31,
    }
    assert jsonLogic(r, base) is True

    # <= 30% → no activa por ampliación (podría activar por presión/potencia)
    ctx_30 = {**base, "incremento_potencia_pct": 30}
    assert jsonLogic(r, ctx_30) is False

    # Ampliación False → no activa
    ctx_no_amp = {**base, "es_ampliacion": False, "incremento_potencia_pct": 99}
    assert jsonLogic(r, ctx_no_amp) is False


def test_cataluna_gas_sin_proyecto():
    """Sin umbrales → declaración responsable (CIG)."""
    data = load_rules("gas_baja_presion.json")
    r = rule_condition(data, "CAT-GAS-SIN-PROYECTO")

    ctx = {
        "presion_resultante_bar": 0.1,
        "clase_instalacion_gas": "individual",
        "potencia_resultante_kw": 50,
        "es_ampliacion": False,
        "incremento_potencia_pct": 0,
    }
    assert jsonLogic(r, ctx) is True

    # Si la potencia supera el umbral individual ya no aplica
    ctx_super = {**ctx, "potencia_resultante_kw": 71}
    assert jsonLogic(r, ctx_super) is False


# ─── 5. IRVE ─────────────────────────────────────────────────────────────────

def test_cataluna_irve_declaracion_vs_autorizacion():
    data = load_rules("irve.json")
    r_decl = rule_condition(data, "CAT-IRVE-DECLARACION-RESPONSABLE")
    r_aut  = rule_condition(data, "CAT-IRVE-AUTORIZACION")

    base = {
        "potencia_kw": 22,
        "modo_recarga": "3",
        "ubicacion_irve": "interior",
    }

    # Base: declaración
    assert jsonLogic(r_decl, base) is True
    assert jsonLogic(r_aut,  base) is False

    # Modo 4 → autorización
    ctx_m4 = {**base, "modo_recarga": "4"}
    assert jsonLogic(r_decl, ctx_m4) is False
    assert jsonLogic(r_aut,  ctx_m4) is True

    # > 50 kW → autorización
    ctx_51 = {**base, "potencia_kw": 51}
    assert jsonLogic(r_decl, ctx_51) is False
    assert jsonLogic(r_aut,  ctx_51) is True

    # Exactamente 50 kW → declaración
    ctx_50 = {**base, "potencia_kw": 50}
    assert jsonLogic(r_decl, ctx_50) is True
    assert jsonLogic(r_aut,  ctx_50) is False

    # Exterior > 10 kW → autorización
    ctx_ext11 = {**base, "ubicacion_irve": "exterior", "potencia_kw": 11}
    assert jsonLogic(r_decl, ctx_ext11) is False
    assert jsonLogic(r_aut,  ctx_ext11) is True

    # Exterior <= 10 kW → declaración
    ctx_ext10 = {**base, "ubicacion_irve": "exterior", "potencia_kw": 10}
    assert jsonLogic(r_decl, ctx_ext10) is True
    assert jsonLogic(r_aut,  ctx_ext10) is False


def test_cataluna_irve_garaje_comunitario():
    data = load_rules("irve.json")
    r_garaje = rule_condition(data, "CAT-IRVE-APARCAMIENTO-COMUNITARIO")

    assert jsonLogic(r_garaje, {"ubicacion_irve": "garaje_comunitario"}) is True
    assert jsonLogic(r_garaje, {"ubicacion_irve": "interior"})          is False
    assert jsonLogic(r_garaje, {"ubicacion_irve": "exterior"})          is False


# ─── 6. Fotovoltaica ─────────────────────────────────────────────────────────

def test_cataluna_fv_ritsic_siempre():
    """CAT-FV-BT-ALTA-RITSIC debe activarse para cualquier fotovoltaica de autoconsumo."""
    data = load_rules("fotovoltaica_autoconsumo.json")
    r = rule_condition(data, "CAT-FV-BT-ALTA-RITSIC")

    assert jsonLogic(r, {"tipo_instalacion": "fotovoltaica_autoconsumo"}) is True
    assert jsonLogic(r, {"tipo_instalacion": "irve"})                     is False


def test_cataluna_fv_aap_aac_gran_instalacion():
    data = load_rules("fotovoltaica_autoconsumo.json")
    r = rule_condition(data, "CAT-FV-AAP-AAC-GRAN-INSTALACION")

    assert jsonLogic(r, {"potencia_kw": 501})  is True
    assert jsonLogic(r, {"potencia_kw": 500})  is False
    assert jsonLogic(r, {"potencia_kw": 1000}) is True


def test_cataluna_fv_declaracion_100_500():
    """100 < kW <= 500 → exención AAP/AAC, solo declaración responsable."""
    data = load_rules("fotovoltaica_autoconsumo.json")
    r = rule_condition(data, "CAT-FV-DECLARACION-PRODUCCION-100-500")

    assert jsonLogic(r, {"potencia_kw": 100.1}) is True
    assert jsonLogic(r, {"potencia_kw": 500})   is True
    assert jsonLogic(r, {"potencia_kw": 100})   is False  # <= 100 no aplica esta regla
    assert jsonLogic(r, {"potencia_kw": 500.1}) is False  # > 500 → AAP/AAC


def test_cataluna_fv_acceso_conexion():
    """RAC solo si modalidad con excedentes Y requiere_acceso_conexion = True."""
    data = load_rules("fotovoltaica_autoconsumo.json")
    r = rule_condition(data, "CAT-FV-ACCESO-CONEXION")

    ctx_si = {
        "modalidad_autoconsumo": "con_excedentes_con_compensacion",
        "requiere_acceso_conexion": True,
    }
    ctx_no_modalidad = {
        "modalidad_autoconsumo": "sin_excedentes",
        "requiere_acceso_conexion": True,
    }
    ctx_no_acceso = {
        "modalidad_autoconsumo": "con_excedentes_sin_compensacion",
        "requiere_acceso_conexion": False,
    }

    assert jsonLogic(r, ctx_si)           is True
    assert jsonLogic(r, ctx_no_modalidad) is False
    assert jsonLogic(r, ctx_no_acceso)    is False


def test_cataluna_fv_tramite_21526_solo_compensacion_le_100kw():
    """El trámite 21526 aplica SOLO a con_excedentes_con_compensacion y potencia <= 100 kW."""
    data = load_rules("fotovoltaica_autoconsumo.json")
    r = rule_condition(data, "CAT-FV-TRAMITE-21526")

    # Positivos
    assert jsonLogic(r, {"modalidad_autoconsumo": "con_excedentes_con_compensacion", "potencia_kw": 50})  is True
    assert jsonLogic(r, {"modalidad_autoconsumo": "con_excedentes_con_compensacion", "potencia_kw": 100}) is True

    # > 100 kW → no aplica
    assert jsonLogic(r, {"modalidad_autoconsumo": "con_excedentes_con_compensacion", "potencia_kw": 101}) is False

    # Sin compensación → no aplica
    assert jsonLogic(r, {"modalidad_autoconsumo": "con_excedentes_sin_compensacion", "potencia_kw": 50}) is False

    # Sin excedentes → no aplica
    assert jsonLogic(r, {"modalidad_autoconsumo": "sin_excedentes", "potencia_kw": 50}) is False


def test_cataluna_fv_ripre_sin_compensacion():
    data = load_rules("fotovoltaica_autoconsumo.json")
    r = rule_condition(data, "CAT-FV-RIPRE-EXCEDENTES-SIN-COMP")

    assert jsonLogic(r, {"modalidad_autoconsumo": "con_excedentes_sin_compensacion"}) is True
    assert jsonLogic(r, {"modalidad_autoconsumo": "con_excedentes_con_compensacion"}) is False
    assert jsonLogic(r, {"modalidad_autoconsumo": "sin_excedentes"})                  is False


def test_cataluna_fv_puesta_servicio_siempre():
    """CAT-FV-PUESTA-SERVICIO debe activarse para cualquier fotovoltaica."""
    data = load_rules("fotovoltaica_autoconsumo.json")
    r = rule_condition(data, "CAT-FV-PUESTA-SERVICIO")

    assert jsonLogic(r, {"tipo_instalacion": "fotovoltaica_autoconsumo"}) is True
    assert jsonLogic(r, {"tipo_instalacion": "irve"})                     is False


# ─── 7. Integración con el clasificador ──────────────────────────────────────

def test_cataluna_clasificador_gas_sin_proyecto():
    c = Clasificador()
    params = ClasificadorInput(
        tipo_instalacion="gas_baja_presion",
        comunidad="cataluna",
        potencia_kw=50,
        uso="residencial",
        clase_instalacion_gas="individual",
        presion_resultante_bar=0.1,
        potencia_resultante_kw=50,
        es_ampliacion=False,
    )
    res = c.clasificar(params)
    assert len(res.tramites) > 0
    ids = [t.regla_id for t in res.tramites]
    assert "CAT-GAS-SIN-PROYECTO" in ids


def test_cataluna_clasificador_gas_proyecto_presion():
    c = Clasificador()
    params = ClasificadorInput(
        tipo_instalacion="gas_baja_presion",
        comunidad="cataluna",
        potencia_kw=50,
        uso="industrial",
        clase_instalacion_gas="individual",
        presion_resultante_bar=6.0,
        potencia_resultante_kw=50,
        es_ampliacion=False,
    )
    res = c.clasificar(params)
    ids = [t.regla_id for t in res.tramites]
    assert "CAT-GAS-PROYECTO-ALTA-PRESION" in ids


def test_cataluna_clasificador_gas_falta_datos_validation_error():
    """Faltan potencia_resultante_kw y presion_resultante_bar → ValidationError."""
    with pytest.raises(ValidationError):
        ClasificadorInput(
            tipo_instalacion="gas_baja_presion",
            comunidad="cataluna",
            potencia_kw=50,
            uso="industrial",
            clase_instalacion_gas="individual",
            # Sin presion_resultante_bar ni potencia_resultante_kw
        )


def test_cataluna_clasificador_irve_garaje_falta_datos():
    """Datos garaje incompletos en Cataluña IRVE → ValidationError."""
    with pytest.raises(ValidationError):
        ClasificadorInput(
            tipo_instalacion="irve",
            comunidad="cataluna",
            potencia_kw=22,
            uso="residencial",
            ubicacion_irve="garaje_comunitario",
            # Sin uso_edificio, ventilacion_garaje, numero_plazas_garaje, garaje_existente
        )


def test_cataluna_clasificador_fv_ritsic_presente():
    """La regla CAT-FV-BT-ALTA-RITSIC siempre aparece para fotovoltaica."""
    c = Clasificador()
    params = ClasificadorInput(
        tipo_instalacion="fotovoltaica_autoconsumo",
        comunidad="cataluna",
        potencia_kw=50,
        uso="residencial",
        modalidad_autoconsumo="sin_excedentes",
        ubicacion_suelo="urbanizado",
        requiere_acceso_conexion=False,
    )
    res = c.clasificar(params)
    ids = [t.regla_id for t in res.tramites]
    assert "CAT-FV-BT-ALTA-RITSIC" in ids


def test_cataluna_clasificador_fv_tramite_21526_aparece():
    """Trámite 21526 en regla CAT-FV-TRAMITE-21526 con compensacion <= 100 kW."""
    c = Clasificador()
    params = ClasificadorInput(
        tipo_instalacion="fotovoltaica_autoconsumo",
        comunidad="cataluna",
        potencia_kw=80,
        uso="residencial",
        modalidad_autoconsumo="con_excedentes_con_compensacion",
        ubicacion_suelo="urbanizado",
        requiere_acceso_conexion=True,
    )
    res = c.clasificar(params)
    ids = [t.regla_id for t in res.tramites]
    assert "CAT-FV-TRAMITE-21526" in ids


def test_cataluna_clasificador_fv_tramite_21526_no_aparece_gt100():
    """Con compensación pero > 100 kW → CAT-FV-TRAMITE-21526 NO debe aparecer."""
    c = Clasificador()
    params = ClasificadorInput(
        tipo_instalacion="fotovoltaica_autoconsumo",
        comunidad="cataluna",
        potencia_kw=150,
        uso="residencial",
        modalidad_autoconsumo="con_excedentes_con_compensacion",
        ubicacion_suelo="urbanizado",
        requiere_acceso_conexion=True,
    )
    res = c.clasificar(params)
    ids = [t.regla_id for t in res.tramites]
    assert "CAT-FV-TRAMITE-21526" not in ids
