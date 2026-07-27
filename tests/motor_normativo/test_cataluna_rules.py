"""
Tests para las reglas normativas de Cataluña — v1.2.0
Cubre todos los casos de las auditorías v1 y v2, incluyendo:
- Fronteras de potencia (RITE, gas, FV)
- Validaciones condicionales (garaje, ACS centralizada, legionella)
- Reglas aditivas fotovoltaica (21526, RIPRE, AAP/AAC, RITSIC, puesta en servicio)
- Nuevas reglas informativas (inspección periódica ACS, OC IRVE residencial, Barcelona dominio público)
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
    if isinstance(node, dict):
        if "" in node:
            raise ValueError(f"Clave operador vacía '' en {path}")
        for k, v in node.items():
            validate_no_empty_keys(v, path + f"/{k}")
    elif isinstance(node, list):
        for i, item in enumerate(node):
            validate_no_empty_keys(item, path + f"[{i}]")


def rule_condition(data: dict, rule_id: str):
    for rule in data["reglas"]:
        if rule["id"] == rule_id:
            return rule["condicion"]
    raise KeyError(f"Regla {rule_id!r} no encontrada")


# ─── 1. Integridad JSONLogic ──────────────────────────────────────────────────

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


def test_cataluna_no_generic_canal_empresa_urls():
    """No debe haber la URL genérica de la home de Canal Empresa."""
    GENERIC = "https://canalempresa.gencat.cat"
    for filename in FILES:
        data = load_rules(filename)
        for rule in data.get("reglas", []):
            for tramite in rule.get("tramites", []):
                url = tramite.get("plataforma_url") or ""
                assert url != GENERIC, (
                    f"URL genérica en {filename}/{rule['id']}: {url!r}"
                )


def test_cataluna_no_trailing_backtick_in_urls():
    """Ninguna URL debe terminar en acento grave (artefacto de markdown)."""
    for filename in FILES:
        data = load_rules(filename)
        for rule in data.get("reglas", []):
            for tramite in rule.get("tramites", []):
                url = tramite.get("plataforma_url") or ""
                assert not url.endswith("`"), (
                    f"URL con backtick final en {filename}/{rule['id']}: {url!r}"
                )


def test_cataluna_no_html_in_urls():
    """Ninguna URL debe contener etiquetas HTML."""
    for filename in FILES:
        data = load_rules(filename)
        for rule in data.get("reglas", []):
            for tramite in rule.get("tramites", []):
                url = tramite.get("plataforma_url") or ""
                assert "<a" not in url and "</a>" not in url, (
                    f"HTML en URL de {filename}/{rule['id']}: {url!r}"
                )


def test_cataluna_no_legacy_notes_field():
    """No debe existir la clave 'notes' (solo 'notas')."""
    for filename in FILES:
        data = load_rules(filename)
        raw = json.dumps(data)
        assert '"notes"' not in raw, (
            f"Clave legacy 'notes' encontrada en {filename}"
        )


def test_cataluna_nivel_verificacion_no_verificada():
    """Ningún fichero Cataluña puede tener nivel_verificacion='verificada' con huecos abiertos."""
    ALLOWED = {"verificada_parcialmente", "en_revision", "borrador_verificado_parcialmente"}
    for filename in FILES:
        data = load_rules(filename)
        nv = data.get("nivel_verificacion", "")
        assert nv in ALLOWED or nv == "verificada_parcialmente", (
            f"{filename}: nivel_verificacion={nv!r} no está en el conjunto permitido {ALLOWED}"
        )


def test_cataluna_registro_salida_ritsic_when_organismo_empresa():
    """Trámites con organismo Empresa i Treball y plataforma → registro_salida = RITSIC."""
    for filename in FILES:
        data = load_rules(filename)
        for rule in data.get("reglas", []):
            for tramite in rule.get("tramites", []):
                organismo = tramite.get("organismo", "")
                if "Empresa i Treball" in organismo and tramite.get("plataforma"):
                    rs = tramite.get("registro_salida")
                    assert rs == "RITSIC", (
                        f"RITSIC esperado en {filename}/{rule['id']}: {rs!r}"
                    )


# ─── 2. ACS ──────────────────────────────────────────────────────────────────

def test_cataluna_acs_potencia_fronteras():
    data = load_rules("acs.json")
    r_info  = rule_condition(data, "CAT-ACS-INFO")
    r_mtd   = rule_condition(data, "CAT-ACS-MTD")
    r_proy  = rule_condition(data, "CAT-ACS-PROYECTO")

    base = {"tipo_instalacion": "acs", "incluida_ambito_legionella": False}

    for kw in (0.5, 4.9):
        ctx = {**base, "potencia_kw": kw}
        assert jsonLogic(r_info, ctx)  is True
        assert jsonLogic(r_mtd,  ctx) is False
        assert jsonLogic(r_proy, ctx) is False

    ctx5 = {**base, "potencia_kw": 5.0}
    assert jsonLogic(r_info, ctx5)  is False
    assert jsonLogic(r_mtd,  ctx5) is True
    assert jsonLogic(r_proy, ctx5) is False

    ctx69 = {**base, "potencia_kw": 69.9}
    assert jsonLogic(r_mtd,  ctx69) is True
    assert jsonLogic(r_proy, ctx69) is False

    ctx70 = {**base, "potencia_kw": 70.0}
    assert jsonLogic(r_mtd,  ctx70) is False
    assert jsonLogic(r_proy, ctx70) is True


def test_cataluna_acs_legionella_condicion():
    data = load_rules("acs.json")
    r_legio = rule_condition(data, "CAT-ACS-LEGIONELLA")
    base = {"tipo_instalacion": "acs"}

    assert jsonLogic(r_legio, {**base, "incluida_ambito_legionella": True})  is True
    assert jsonLogic(r_legio, {**base, "incluida_ambito_legionella": False}) is False


def test_cataluna_acs_inspeccion_periodica_frontera_estricta():
    """La inspección periódica se activa con >70 kW, NO con exactamente 70."""
    data = load_rules("acs.json")
    r = rule_condition(data, "CAT-ACS-INSPECCION-PERIODICA")

    base = {
        "tipo_instalacion": "acs",
        "acs_centralizada": True,
        "dispone_acumulacion": True,
        "dispone_circuito_retorno": False,
    }

    # Exactamente 70 kW → NO activa inspección periódica (frontera estricta >70)
    ctx70 = {**base, "potencia_kw": 70.0}
    assert jsonLogic(r, ctx70) is False, "70 kW exacto NO debe activar inspección periódica"

    # 70.01 kW → activa
    ctx7001 = {**base, "potencia_kw": 70.01}
    assert jsonLogic(r, ctx7001) is True

    # No centralizada → no activa
    ctx_no_central = {**base, "potencia_kw": 100, "acs_centralizada": False}
    assert jsonLogic(r, ctx_no_central) is False

    # Centralizada pero sin acumulación ni retorno → no activa
    ctx_sin_acu = {**base, "potencia_kw": 100, "dispone_acumulacion": False, "dispone_circuito_retorno": False}
    assert jsonLogic(r, ctx_sin_acu) is False

    # Solo circuito retorno → activa
    ctx_retorno = {**base, "potencia_kw": 100, "dispone_acumulacion": False, "dispone_circuito_retorno": True}
    assert jsonLogic(r, ctx_retorno) is True


def test_cataluna_acs_centralizada_sin_datos_acumulacion_revision_manual():
    """ACS cataluña centralizada >70 kW sin datos de acumulación/retorno → ValidationError."""
    with pytest.raises(ValidationError):
        ClasificadorInput(
            tipo_instalacion="acs",
            comunidad="cataluna",
            potencia_kw=80,
            uso="residencial",
            acs_centralizada=True,
            incluida_ambito_legionella=True,
            # Sin dispone_acumulacion ni dispone_circuito_retorno
        )


def test_cataluna_acs_pequena_sin_legionella_ok():
    """ACS <70 kW no centralizada → no exige incluida_ambito_legionella."""
    params = ClasificadorInput(
        tipo_instalacion="acs",
        comunidad="cataluna",
        potencia_kw=20,
        uso="residencial",
        # Sin incluida_ambito_legionella → no debe lanzar error
    )
    assert params.potencia_kw == 20


# ─── 3. Aerotermia ───────────────────────────────────────────────────────────

def test_cataluna_aerotermia_potencia_fronteras():
    data = load_rules("climatizacion_aerotermia.json")
    r_info = rule_condition(data, "CAT-AERO-INFO")
    r_mtd  = rule_condition(data, "CAT-AERO-MTD")
    r_proy = rule_condition(data, "CAT-AERO-PROYECTO")

    base = {"tipo_instalacion": "climatizacion_aerotermia"}

    for kw in (1, 4.9):
        ctx = {**base, "potencia_kw": kw}
        assert jsonLogic(r_info, ctx) is True
        assert jsonLogic(r_mtd,  ctx) is False

    ctx5 = {**base, "potencia_kw": 5}
    assert jsonLogic(r_info, ctx5) is False
    assert jsonLogic(r_mtd,  ctx5) is True
    assert jsonLogic(r_proy, ctx5) is False

    ctx70 = {**base, "potencia_kw": 70}
    assert jsonLogic(r_mtd,  ctx70) is False
    assert jsonLogic(r_proy, ctx70) is True

    assert data.get("nivel_verificacion") == "verificada_parcialmente"


# ─── 4. Gas ──────────────────────────────────────────────────────────────────

def test_cataluna_gas_alta_presion():
    data = load_rules("gas_baja_presion.json")
    r_ap = rule_condition(data, "CAT-GAS-PROYECTO-ALTA-PRESION")

    assert jsonLogic(r_ap, {"presion_resultante_bar": 5.1})  is True
    assert jsonLogic(r_ap, {"presion_resultante_bar": 5.0})  is False
    assert jsonLogic(r_ap, {"presion_resultante_bar": 10.0}) is True


def test_cataluna_gas_potencia_individual():
    data = load_rules("gas_baja_presion.json")
    r = rule_condition(data, "CAT-GAS-PROYECTO-POTENCIA-INDIVIDUAL")

    ctx_ok = {
        "presion_resultante_bar": 0.1,
        "clase_instalacion_gas": "individual",
        "potencia_resultante_kw": 70.1,
    }
    assert jsonLogic(r, ctx_ok) is True

    ctx_borde = {**ctx_ok, "potencia_resultante_kw": 70.0}
    assert jsonLogic(r, ctx_borde) is False

    ctx_comun = {**ctx_ok, "clase_instalacion_gas": "comun"}
    assert jsonLogic(r, ctx_comun) is False


def test_cataluna_gas_potencia_comun():
    data = load_rules("gas_baja_presion.json")
    r = rule_condition(data, "CAT-GAS-PROYECTO-COMUN")

    base = {"presion_resultante_bar": 0.1}

    for clase in ("comun", "conexion_servicio"):
        ctx_si = {**base, "clase_instalacion_gas": clase, "potencia_resultante_kw": 2001}
        ctx_no = {**base, "clase_instalacion_gas": clase, "potencia_resultante_kw": 2000}
        assert jsonLogic(r, ctx_si) is True
        assert jsonLogic(r, ctx_no) is False


def test_cataluna_gas_ampliacion():
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

    ctx_30 = {**base, "incremento_potencia_pct": 30}
    assert jsonLogic(r, ctx_30) is False

    ctx_no_amp = {**base, "es_ampliacion": False, "incremento_potencia_pct": 99}
    assert jsonLogic(r, ctx_no_amp) is False


def test_cataluna_gas_ampliacion_resultante_cruza_umbral_individual():
    """Ampliación 20% pero potencia resultante >70 kW → proyecto (por INDIVIDUAL, no por % ampliación)."""
    data = load_rules("gas_baja_presion.json")
    r_ind = rule_condition(data, "CAT-GAS-PROYECTO-POTENCIA-INDIVIDUAL")

    ctx = {
        "presion_resultante_bar": 0.1,
        "clase_instalacion_gas": "individual",
        "potencia_resultante_kw": 70.1,  # cruza umbral resultante
    }
    assert jsonLogic(r_ind, ctx) is True


def test_cataluna_gas_ampliacion_resultante_cruza_presion():
    """Ampliación con presión resultante >5 bar → proyecto (por ALTA-PRESION)."""
    data = load_rules("gas_baja_presion.json")
    r_ap = rule_condition(data, "CAT-GAS-PROYECTO-ALTA-PRESION")

    assert jsonLogic(r_ap, {"presion_resultante_bar": 5.01}) is True


def test_cataluna_gas_ampliacion_30_sin_cruzar_umbral():
    """Ampliación exactamente 30%, individual, resultante 50 kW, 0.1 bar → sin proyecto."""
    data = load_rules("gas_baja_presion.json")
    r = rule_condition(data, "CAT-GAS-SIN-PROYECTO")

    ctx = {
        "presion_resultante_bar": 0.1,
        "clase_instalacion_gas": "individual",
        "potencia_resultante_kw": 50,
        "es_ampliacion": True,
        "incremento_potencia_pct": 30,  # exactamente 30 → no activa AMPLIACION (>30)
    }
    assert jsonLogic(r, ctx) is True


def test_cataluna_gas_clase_invalida_validacion_error():
    """Una clase de gas fuera del enum Pydantic debe generar ValidationError, nunca llegar a JSONLogic."""
    with pytest.raises(ValidationError):
        ClasificadorInput(
            tipo_instalacion="gas_baja_presion",
            comunidad="cataluna",
            potencia_kw=50,
            uso="industrial",
            clase_instalacion_gas="desconocida",  # type: ignore[arg-type]
            presion_resultante_bar=0.1,
            potencia_resultante_kw=50,
            es_ampliacion=False,
        )


def test_cataluna_gas_sin_proyecto():
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

    ctx_super = {**ctx, "potencia_resultante_kw": 71}
    assert jsonLogic(r, ctx_super) is False


# ─── 5. IRVE ─────────────────────────────────────────────────────────────────

def test_cataluna_irve_declaracion_vs_autorizacion():
    data = load_rules("irve.json")
    r_decl = rule_condition(data, "CAT-IRVE-DECLARACION-RESPONSABLE")
    r_aut  = rule_condition(data, "CAT-IRVE-AUTORIZACION")

    base = {"potencia_kw": 22, "modo_recarga": "3", "ubicacion_irve": "interior"}

    assert jsonLogic(r_decl, base) is True
    assert jsonLogic(r_aut,  base) is False

    ctx_m4 = {**base, "modo_recarga": "4"}
    assert jsonLogic(r_decl, ctx_m4) is False
    assert jsonLogic(r_aut,  ctx_m4) is True

    ctx_51 = {**base, "potencia_kw": 51}
    assert jsonLogic(r_decl, ctx_51) is False
    assert jsonLogic(r_aut,  ctx_51) is True

    ctx_50 = {**base, "potencia_kw": 50}
    assert jsonLogic(r_decl, ctx_50) is True
    assert jsonLogic(r_aut,  ctx_50) is False

    ctx_ext11 = {**base, "ubicacion_irve": "exterior", "potencia_kw": 11}
    assert jsonLogic(r_decl, ctx_ext11) is False
    assert jsonLogic(r_aut,  ctx_ext11) is True

    ctx_ext10 = {**base, "ubicacion_irve": "exterior", "potencia_kw": 10}
    assert jsonLogic(r_decl, ctx_ext10) is True
    assert jsonLogic(r_aut,  ctx_ext10) is False


def test_cataluna_irve_garaje_sin_uso_edificio_revision_manual():
    with pytest.raises(ValidationError):
        ClasificadorInput(
            tipo_instalacion="irve", comunidad="cataluna",
            potencia_kw=22, uso="residencial",
            ubicacion_irve="garaje_comunitario",
            modo_recarga="3",
            # Sin uso_edificio → revision_manual
            ventilacion_garaje="natural",
            numero_plazas_garaje=10,
            garaje_existente=True,
        )


def test_cataluna_irve_garaje_sin_ventilacion_revision_manual():
    with pytest.raises(ValidationError):
        ClasificadorInput(
            tipo_instalacion="irve", comunidad="cataluna",
            potencia_kw=22, uso="residencial",
            ubicacion_irve="garaje_comunitario",
            modo_recarga="3",
            uso_edificio="residencial",
            # Sin ventilacion_garaje → revision_manual
            numero_plazas_garaje=10,
            garaje_existente=True,
        )


def test_cataluna_irve_garaje_sin_numero_plazas_revision_manual():
    with pytest.raises(ValidationError):
        ClasificadorInput(
            tipo_instalacion="irve", comunidad="cataluna",
            potencia_kw=22, uso="residencial",
            ubicacion_irve="garaje_comunitario",
            modo_recarga="3",
            uso_edificio="residencial",
            ventilacion_garaje="natural",
            # Sin numero_plazas_garaje → revision_manual
            garaje_existente=True,
        )


def test_cataluna_irve_garaje_sin_garaje_existente_revision_manual():
    with pytest.raises(ValidationError):
        ClasificadorInput(
            tipo_instalacion="irve", comunidad="cataluna",
            potencia_kw=22, uso="residencial",
            ubicacion_irve="garaje_comunitario",
            modo_recarga="3",
            uso_edificio="residencial",
            ventilacion_garaje="natural",
            numero_plazas_garaje=10,
            # Sin garaje_existente → revision_manual
        )


def test_cataluna_irve_inspeccion_oc_residencial_19_no_activa():
    """19 suministros residenciales → NO activa la advertencia de inspección OC."""
    data = load_rules("irve.json")
    r = rule_condition(data, "CAT-IRVE-INSPECCION-INICIAL-VERIFICAR")

    ctx = {"uso_edificio": "residencial", "numero_suministros_edificio": 19}
    assert jsonLogic(r, ctx) is False


def test_cataluna_irve_inspeccion_oc_residencial_20_activa():
    """20 suministros residenciales → activa advertencia OC (pendiente de verificación)."""
    data = load_rules("irve.json")
    r = rule_condition(data, "CAT-IRVE-INSPECCION-INICIAL-VERIFICAR")

    ctx = {"uso_edificio": "residencial", "numero_suministros_edificio": 20}
    assert jsonLogic(r, ctx) is True


def test_cataluna_irve_inspeccion_oc_no_residencial_no_activa():
    """No residencial + 20 suministros → NO activa la regla de inspección OC."""
    data = load_rules("irve.json")
    r = rule_condition(data, "CAT-IRVE-INSPECCION-INICIAL-VERIFICAR")

    ctx = {"uso_edificio": "no_residencial", "numero_suministros_edificio": 20}
    assert jsonLogic(r, ctx) is False


def test_cataluna_irve_via_publica_barcelona_activa():
    """Barcelona + via_publica → activa advertencia municipal."""
    data = load_rules("irve.json")
    r = rule_condition(data, "CAT-IRVE-VIA-PUBLICA-BARCELONA")

    assert jsonLogic(r, {"municipio": "barcelona", "ubicacion_irve": "via_publica"}) is True
    assert jsonLogic(r, {"municipio": "barcelona", "ubicacion_irve": "interior"})    is False
    assert jsonLogic(r, {"municipio": "sabadell",  "ubicacion_irve": "via_publica"}) is False


# ─── 6. Fotovoltaica ─────────────────────────────────────────────────────────

def test_cataluna_fv_ritsic_siempre():
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


def test_cataluna_fv_exencion_aap_aac_fronteras():
    """Exención AAP/AAC: solo para potencia >100 y <=500 kW (Decret Llei 22/2025)."""
    data = load_rules("fotovoltaica_autoconsumo.json")
    r = rule_condition(data, "CAT-FV-DECLARACION-PRODUCCION-100-500")

    # 100 exacto → NO activa (>100 estricto)
    assert jsonLogic(r, {"potencia_kw": 100})   is False
    # 100.01 → activa
    assert jsonLogic(r, {"potencia_kw": 100.01}) is True
    # 500 → activa (<=500)
    assert jsonLogic(r, {"potencia_kw": 500})   is True
    # 500.01 → NO activa (>500 → régimen ordinario AAP/AAC)
    assert jsonLogic(r, {"potencia_kw": 500.01}) is False


def test_cataluna_fv_21526_renombrado_y_fronteras():
    """El trámite 21526 usa el nuevo ID CAT-FV-COMPENSACION-21526 y fronteras correctas."""
    data = load_rules("fotovoltaica_autoconsumo.json")
    r = rule_condition(data, "CAT-FV-COMPENSACION-21526")

    # 100 kW con compensación → activa (<=100 incluido)
    assert jsonLogic(r, {"modalidad_autoconsumo": "con_excedentes_con_compensacion", "potencia_kw": 100})   is True
    # 100.01 → NO activa
    assert jsonLogic(r, {"modalidad_autoconsumo": "con_excedentes_con_compensacion", "potencia_kw": 100.01}) is False
    # Sin excedentes 100 kW → NO activa
    assert jsonLogic(r, {"modalidad_autoconsumo": "sin_excedentes", "potencia_kw": 100})                    is False
    # Sin compensación → NO activa
    assert jsonLogic(r, {"modalidad_autoconsumo": "con_excedentes_sin_compensacion", "potencia_kw": 50})    is False


def test_cataluna_fv_tramite_21526_viejo_id_no_existe():
    """El ID antiguo CAT-FV-TRAMITE-21526 ya no debe existir en el JSON."""
    data = load_rules("fotovoltaica_autoconsumo.json")
    ids = [r["id"] for r in data.get("reglas", [])]
    assert "CAT-FV-TRAMITE-21526" not in ids, "El ID antiguo no debe existir; usar CAT-FV-COMPENSACION-21526"


def test_cataluna_fv_ripre_requiere_flag():
    """RIPRE solo se activa cuando requiere_registro_produccion == True."""
    data = load_rules("fotovoltaica_autoconsumo.json")
    r = rule_condition(data, "CAT-FV-RIPRE-EXCEDENTES-SIN-COMP")

    ctx_si = {"modalidad_autoconsumo": "con_excedentes_sin_compensacion", "requiere_registro_produccion": True}
    ctx_no = {"modalidad_autoconsumo": "con_excedentes_sin_compensacion", "requiere_registro_produccion": False}
    ctx_comp = {"modalidad_autoconsumo": "con_excedentes_con_compensacion", "requiere_registro_produccion": True}

    assert jsonLogic(r, ctx_si)   is True
    assert jsonLogic(r, ctx_no)   is False
    assert jsonLogic(r, ctx_comp) is False


def test_cataluna_fv_acceso_conexion():
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


def test_cataluna_fv_puesta_servicio_siempre():
    data = load_rules("fotovoltaica_autoconsumo.json")
    r = rule_condition(data, "CAT-FV-PUESTA-SERVICIO")

    assert jsonLogic(r, {"tipo_instalacion": "fotovoltaica_autoconsumo"}) is True
    assert jsonLogic(r, {"tipo_instalacion": "irve"})                     is False


# ─── 7. Integración con el clasificador ──────────────────────────────────────

def test_cataluna_clasificador_gas_sin_proyecto():
    c = Clasificador()
    params = ClasificadorInput(
        tipo_instalacion="gas_baja_presion", comunidad="cataluna",
        potencia_kw=50, uso="residencial",
        clase_instalacion_gas="individual",
        presion_resultante_bar=0.1, potencia_resultante_kw=50,
        es_ampliacion=False,
    )
    res = c.clasificar(params)
    assert len(res.tramites) > 0
    ids = [t.regla_id for t in res.tramites]
    assert "CAT-GAS-SIN-PROYECTO" in ids


def test_cataluna_clasificador_gas_proyecto_presion():
    c = Clasificador()
    params = ClasificadorInput(
        tipo_instalacion="gas_baja_presion", comunidad="cataluna",
        potencia_kw=50, uso="industrial",
        clase_instalacion_gas="individual",
        presion_resultante_bar=6.0, potencia_resultante_kw=50,
        es_ampliacion=False,
    )
    res = c.clasificar(params)
    ids = [t.regla_id for t in res.tramites]
    assert "CAT-GAS-PROYECTO-ALTA-PRESION" in ids


def test_cataluna_clasificador_gas_clase_invalida():
    """clase_instalacion_gas inválida → ValidationError (nunca llega a JSONLogic)."""
    with pytest.raises(ValidationError):
        ClasificadorInput(
            tipo_instalacion="gas_baja_presion", comunidad="cataluna",
            potencia_kw=50, uso="industrial",
            clase_instalacion_gas="desconocida",  # type: ignore[arg-type]
            presion_resultante_bar=0.1, potencia_resultante_kw=50,
            es_ampliacion=False,
        )


def test_cataluna_clasificador_fv_ritsic_presente():
    c = Clasificador()
    params = ClasificadorInput(
        tipo_instalacion="fotovoltaica_autoconsumo", comunidad="cataluna",
        potencia_kw=50, uso="residencial",
        modalidad_autoconsumo="sin_excedentes",
        ubicacion_suelo="urbanizado", requiere_acceso_conexion=False,
    )
    res = c.clasificar(params)
    ids = [t.regla_id for t in res.tramites]
    assert "CAT-FV-BT-ALTA-RITSIC" in ids


def test_cataluna_clasificador_fv_21526_aparece_nuevo_id():
    """El nuevo ID CAT-FV-COMPENSACION-21526 aparece en compensación <=100 kW."""
    c = Clasificador()
    params = ClasificadorInput(
        tipo_instalacion="fotovoltaica_autoconsumo", comunidad="cataluna",
        potencia_kw=80, uso="residencial",
        modalidad_autoconsumo="con_excedentes_con_compensacion",
        ubicacion_suelo="urbanizado", requiere_acceso_conexion=True,
    )
    res = c.clasificar(params)
    ids = [t.regla_id for t in res.tramites]
    assert "CAT-FV-COMPENSACION-21526" in ids


def test_cataluna_clasificador_fv_21526_no_aparece_gt100():
    """Compensación >100 kW → CAT-FV-COMPENSACION-21526 no debe aparecer."""
    c = Clasificador()
    params = ClasificadorInput(
        tipo_instalacion="fotovoltaica_autoconsumo", comunidad="cataluna",
        potencia_kw=150, uso="residencial",
        modalidad_autoconsumo="con_excedentes_con_compensacion",
        ubicacion_suelo="urbanizado", requiere_acceso_conexion=True,
    )
    res = c.clasificar(params)
    ids = [t.regla_id for t in res.tramites]
    assert "CAT-FV-COMPENSACION-21526" not in ids


def test_cataluna_clasificador_fv_ripre_false_no_aparece():
    """requiere_registro_produccion=False → RIPRE no debe aparecer."""
    c = Clasificador()
    params = ClasificadorInput(
        tipo_instalacion="fotovoltaica_autoconsumo", comunidad="cataluna",
        potencia_kw=80, uso="residencial",
        modalidad_autoconsumo="con_excedentes_sin_compensacion",
        ubicacion_suelo="urbanizado",
        requiere_acceso_conexion=True,
        requiere_registro_produccion=False,
    )
    res = c.clasificar(params)
    ids = [t.regla_id for t in res.tramites]
    assert "CAT-FV-RIPRE-EXCEDENTES-SIN-COMP" not in ids


def test_cataluna_clasificador_fv_ripre_true_aparece():
    """requiere_registro_produccion=True → RIPRE debe aparecer."""
    c = Clasificador()
    params = ClasificadorInput(
        tipo_instalacion="fotovoltaica_autoconsumo", comunidad="cataluna",
        potencia_kw=80, uso="residencial",
        modalidad_autoconsumo="con_excedentes_sin_compensacion",
        ubicacion_suelo="urbanizado",
        requiere_acceso_conexion=True,
        requiere_registro_produccion=True,
    )
    res = c.clasificar(params)
    ids = [t.regla_id for t in res.tramites]
    assert "CAT-FV-RIPRE-EXCEDENTES-SIN-COMP" in ids


def test_cataluna_schema_tension_sincronizacion():
    """tension='BT' debe sincronizarse automáticamente a nivel_tension_conexion='bt'."""
    params = ClasificadorInput(
        tipo_instalacion="fotovoltaica_autoconsumo", comunidad="cataluna",
        potencia_kw=50, uso="residencial",
        modalidad_autoconsumo="sin_excedentes",
        ubicacion_suelo="urbanizado", requiere_acceso_conexion=False,
        tension="BT",
    )
    assert params.nivel_tension_conexion == "bt"


def test_cataluna_schema_tension_incompatible_error():
    """tension='BT' y nivel_tension_conexion='at' → ValidationError."""
    with pytest.raises(ValidationError):
        ClasificadorInput(
            tipo_instalacion="fotovoltaica_autoconsumo", comunidad="cataluna",
            potencia_kw=50, uso="residencial",
            modalidad_autoconsumo="sin_excedentes",
            ubicacion_suelo="urbanizado", requiere_acceso_conexion=False,
            tension="BT",
            nivel_tension_conexion="at",
        )
