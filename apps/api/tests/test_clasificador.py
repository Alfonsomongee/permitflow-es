import pytest
from pydantic import ValidationError
from motor_normativo.clasificador import Clasificador
from motor_normativo.excepciones import NormativaNoEncontradaError
from schemas.clasificador import ClasificadorInput

@pytest.fixture
def clasificador():
    return Clasificador()

def test_comunidad_invalida_rechazada_por_schema():
    # Tras Literal[...] en ClasificadorInput, un slug no soportado ya ni
    # siquiera llega al motor: falla en la validación de entrada.
    with pytest.raises(ValidationError):
        ClasificadorInput(
            tipo_instalacion="fotovoltaica_autoconsumo",
            comunidad="ceuta",
            potencia_kw=5,
            uso="residencial",
            municipio="Ceuta",
        )


# ─── IRVE: modo_recarga y ubicacion_irve son obligatorios (2026-08-20) ──────
#
# A diferencia de tipo_generador_acs (ver más abajo), no hay ningún caso
# documentado en el que omitir estos dos campos sea deliberadamente
# retrocompatible: se bloquean con un 422 explícito en vez de dejar que la
# rama negativa gane en silencio (auditoría motor normativo 2026-08-19).

def test_irve_sin_modo_recarga_se_rechaza():
    with pytest.raises(ValidationError, match="modo de recarga"):
        ClasificadorInput(
            tipo_instalacion="irve", comunidad="madrid", potencia_kw=11,
            uso="residencial", ubicacion_irve="exterior",
        )


def test_irve_sin_ubicacion_se_rechaza():
    with pytest.raises(ValidationError, match="ubicación"):
        ClasificadorInput(
            tipo_instalacion="irve", comunidad="madrid", potencia_kw=11,
            uso="residencial", modo_recarga="3",
        )


def test_irve_con_ambos_campos_se_acepta():
    ClasificadorInput(
        tipo_instalacion="irve", comunidad="madrid", potencia_kw=11,
        uso="residencial", modo_recarga="3", ubicacion_irve="exterior",
    )


# ─── ACS: tipo_generador_acs es opcional a propósito, con aviso (2026-08-20) ─
#
# Omitirlo NUNCA hace que la instalación reciba una exención que no le
# corresponde -- el valor por defecto (sin dato) ya es el itinerario más
# gravoso. Por eso no se bloquea (test_umbral_rite_5kw.py::
# test_sin_informar_el_equipo_el_plan_no_cambia exige explícitamente que el
# plan no cambie), pero el usuario debe saber que podría estar pagando de más.

def test_acs_sin_tipo_generador_no_se_bloquea(clasificador):
    # No debe lanzar ValidationError.
    ClasificadorInput(
        tipo_instalacion="acs", comunidad="andalucia", potencia_kw=60,
        uso="residencial",
    )


def test_acs_sin_tipo_generador_incluye_aviso_de_posible_exencion(clasificador):
    params = ClasificadorInput(
        tipo_instalacion="acs", comunidad="andalucia", potencia_kw=60,
        uso="residencial",
    )
    res = clasificador.clasificar(params)
    assert any("no has indicado el equipo" in a.lower() for a in res.advertencias)


def test_acs_con_tipo_generador_exento_no_incluye_el_aviso(clasificador):
    params = ClasificadorInput(
        tipo_instalacion="acs", comunidad="andalucia", potencia_kw=60,
        uso="residencial", tipo_generador_acs="calentador_instantaneo",
    )
    res = clasificador.clasificar(params)
    assert not any("no has indicado el equipo" in a.lower() for a in res.advertencias)

from unittest.mock import patch

def test_vertical_sin_cobertura_en_ccaa(clasificador):
    # Simulamos que el archivo JSON no existe para probar la excepción
    params = ClasificadorInput(
        tipo_instalacion="climatizacion_aerotermia",
        comunidad="madrid",
        potencia_kw=12,
        uso="residencial",
        municipio="Madrid",
    )
    with patch("pathlib.Path.exists", return_value=False):
        with pytest.raises(NormativaNoEncontradaError):
            clasificador.clasificar(params)

def test_fv_madrid_bt_normalizacion(clasificador):
    params = ClasificadorInput(
        tipo_instalacion="fotovoltaica_autoconsumo",
        comunidad="madrid",
        potencia_kw=10,
        uso="residencial",
        tension="BT",
    )
    res = clasificador.clasificar(params)
    tramites = res.tramites
    assert len(tramites) == 2
    
    por_id = {tramite.regla_id: tramite for tramite in res.tramites}
    assert set(por_id.keys()) == {
        "MAD-FV-BT-PUESTA-SERVICIO",
        "MAD-FV-REGISTRO-OFICIO",
    }
    assert por_id["MAD-FV-BT-PUESTA-SERVICIO"].tipo_actuacion == "accion_usuario"
    assert por_id["MAD-FV-REGISTRO-OFICIO"].tipo_actuacion == "oficio_administracion"

def test_fv_madrid_bt_conflicto(clasificador):
    with pytest.raises(ValidationError):
        ClasificadorInput(
            tipo_instalacion="fotovoltaica_autoconsumo",
            comunidad="madrid",
            potencia_kw=10,
            uso="residencial",
            tension="BT",
            nivel_tension_conexion="at"
        )

def test_fv_madrid_sin_tension(clasificador):
    params = ClasificadorInput(
        tipo_instalacion="fotovoltaica_autoconsumo",
        comunidad="madrid",
        potencia_kw=10,
        uso="residencial",
    )
    res = clasificador.clasificar(params)
    assert len(res.tramites) == 1
    assert res.tramites[0].tipo_actuacion == "revision_manual"
    assert res.tramites[0].regla_id == "REVISION-MANUAL-FV-TENSION-AUSENTE"


# ─── Regla transversal solicita_ayuda (arquitectura ahora, investigar después) ──
#
# Auditoría 2026-08-09 detectó que solo Andalucía tenía contenido específico de
# ayudas/subvenciones (AND-FV-003) y que, además, esa regla duplicaba el trámite
# "Solicitud del CAU" ya presente incondicionalmente en AND-FV-001. Se corrigió
# el duplicado y se añadió un trámite genérico transversal (GEN-AYUDA-INFORMATIVA)
# para las CCAA que aún no tienen una regla propia de ayudas condicionada a
# solicita_ayuda -- ver _condicion_referencia_var() y clasificar() en
# motor_normativo/clasificador.py.

def test_andalucia_ayuda_no_duplica_cau_y_no_anade_generico(clasificador):
    # Andalucía ya tiene contenido específico de ayudas (AND-FV-003): no debe
    # aparecer el trámite genérico, y "Solicitud del CAU" debe aparecer una
    # sola vez (antes del fix aparecía dos veces: en AND-FV-001 y AND-FV-003).
    params = ClasificadorInput(
        tipo_instalacion="fotovoltaica_autoconsumo",
        comunidad="andalucia",
        potencia_kw=5,
        uso="residencial",
        tension="BT",
        solicita_ayuda=True,
    )
    res = clasificador.clasificar(params)
    nombres = [t.nombre for t in res.tramites]
    assert nombres.count("Solicitud del CAU (Código de Autoconsumo) a la distribuidora") == 1
    assert "GEN-AYUDA-INFORMATIVA" not in [t.regla_id for t in res.tramites]
    assert any(t.regla_id == "AND-FV-003" for t in res.tramites)

def test_galicia_ayuda_anade_tramite_con_catalogo_real(clasificador):
    # Galicia no tiene (todavía) una regla propia de ayudas en el JSON del motor,
    # pero SÍ hay una entrada investigada en servicios/catalogo_ayudas.py (GAL-FV,
    # INEGA): el trámite transversal debe reutilizar ese contenido real, no un
    # aviso genérico vacío.
    params = ClasificadorInput(
        tipo_instalacion="fotovoltaica_autoconsumo",
        comunidad="galicia",
        potencia_kw=5,
        uso="residencial",
        tension="BT",
        solicita_ayuda=True,
    )
    res = clasificador.clasificar(params)
    genericos = [t for t in res.tramites if t.regla_id == "GEN-AYUDA-INFORMATIVA"]
    assert len(genericos) == 1
    assert genericos[0].tipo_actuacion == "informativa"
    assert "INEGA" in genericos[0].notas
    assert "GAL-FV" in genericos[0].notas or "IN421" in genericos[0].notas

def test_galicia_sin_solicitar_ayuda_no_anade_generico(clasificador):
    params = ClasificadorInput(
        tipo_instalacion="fotovoltaica_autoconsumo",
        comunidad="galicia",
        potencia_kw=5,
        uso="residencial",
        tension="BT",
        solicita_ayuda=False,
    )
    res = clasificador.clasificar(params)
    assert "GEN-AYUDA-INFORMATIVA" not in [t.regla_id for t in res.tramites]

def test_ayuda_generica_sin_catalogo_usa_aviso_honesto(clasificador):
    # La Rioja + gas_baja_presion no tiene ninguna regla propia de ayudas ni
    # entrada en el catálogo (ver test_ayudas.py::test_simular_ayudas_sin_resultados_da_aviso_explicito):
    # el trámite transversal debe usar el aviso honesto de "no localizado",
    # nunca inventar un organismo o convocatoria.
    params = ClasificadorInput(
        tipo_instalacion="gas_baja_presion",
        comunidad="la_rioja",
        potencia_kw=30,
        uso="residencial",
        presion_bar="normal",
        solicita_ayuda=True,
    )
    res = clasificador.clasificar(params)
    genericos = [t for t in res.tramites if t.regla_id == "GEN-AYUDA-INFORMATIVA"]
    assert len(genericos) == 1
    assert "No se ha localizado" in genericos[0].notas
    assert genericos[0].organismo == "Administración autonómica / agencia de energía de tu comunidad"


# ─── Murcia: MUR-ACS-000 / MUR-CL-000 (condición imposible, 2026-08-20) ──────
#
# La condición original (potencia_kw>=5 AND potencia_kw<5) era irrealizable y
# la regla nunca disparaba. La corrección NO consiste en "arreglar" el
# operador para activarla: su rango real (potencia_kw<5) coincide con el de
# MUR-ACS-RITE-EXENTA / MUR-CL-RITE-EXENTA, que ya conceden exención total con
# fuente legal confirmada (RITE art. 15.1.c y 24.2). Activarla produciría un
# plan contradictorio (exenta + memoria técnica a la vez). Se ha desactivado
# explícitamente (condicion=false); estos tests fijan ese comportamiento.

def test_murcia_acs_menos_de_5kw_aplica_exencion_total_sin_contradiccion(clasificador):
    params = ClasificadorInput(
        tipo_instalacion="acs",
        comunidad="murcia",
        potencia_kw=3,
        uso="residencial",
        tipo_generador_acs="caldera",
    )
    res = clasificador.clasificar(params)
    ids = [t.regla_id for t in res.tramites]
    assert "MUR-ACS-RITE-EXENTA" in ids
    assert "MUR-ACS-000" not in ids, (
        "MUR-ACS-000 sigue desactivada a propósito: activarla duplicaría con "
        "conclusión contraria el mismo tramo que ya resuelve MUR-ACS-RITE-EXENTA."
    )


def test_murcia_acs_exactamente_5kw_no_aplica_exencion(clasificador):
    params = ClasificadorInput(
        tipo_instalacion="acs",
        comunidad="murcia",
        potencia_kw=5,
        uso="residencial",
        tipo_generador_acs="caldera",
    )
    res = clasificador.clasificar(params)
    ids = [t.regla_id for t in res.tramites]
    assert "MUR-ACS-RITE-EXENTA" not in ids
    assert "MUR-ACS-001" in ids


def test_murcia_climatizacion_menos_de_5kw_aplica_exencion_total_sin_contradiccion(clasificador):
    params = ClasificadorInput(
        tipo_instalacion="climatizacion_aerotermia",
        comunidad="murcia",
        potencia_kw=4.999,
        uso="residencial",
    )
    res = clasificador.clasificar(params)
    ids = [t.regla_id for t in res.tramites]
    assert "MUR-CL-RITE-EXENTA" in ids
    assert "MUR-CL-000" not in ids


def test_murcia_climatizacion_exactamente_5kw_no_aplica_exencion(clasificador):
    params = ClasificadorInput(
        tipo_instalacion="climatizacion_aerotermia",
        comunidad="murcia",
        potencia_kw=5,
        uso="residencial",
    )
    res = clasificador.clasificar(params)
    ids = [t.regla_id for t in res.tramites]
    assert "MUR-CL-RITE-EXENTA" not in ids
    assert "MUR-CL-001" in ids


# ─── País Vasco: paralelo_con debe resolver a un orden real (2026-08-20) ────
#
# Antes del fix, 'paralelo_con' en el JSON apuntaba al 'id' de la propia
# regla (p.ej. "PV-FV-002") en vez de al 'orden' numérico del trámite
# paralelo. El remapeo de Clasificador.clasificar() no encontraba
# coincidencia y lo resolvía SIEMPRE a None sin lanzar ningún error, así que
# un test que solo comprobara "no hay valores inválidos" habría pasado con el
# bug presente. Estos tests exigen explícitamente que el trámite de CAU /
# acometida SÍ tenga un paralelo_con no nulo, que es lo que expone el bug.

def test_pais_vasco_fv_solicitud_cau_es_paralela_a_tramitacion_administrativa(clasificador):
    params = ClasificadorInput(
        tipo_instalacion="fotovoltaica_autoconsumo",
        comunidad="pais_vasco",
        potencia_kw=50,
        uso="residencial",
        tension="BT",
    )
    res = clasificador.clasificar(params)
    ordenes = {t.orden for t in res.tramites}
    cau = next(t for t in res.tramites if "acceso y conexión" in (t.nombre or "").lower())
    assert cau.paralelo_con is not None, (
        "paralelo_con sigue resolviendo a None: el fix del JSON no se aplicó o "
        "el remapeo de clasificador.py lo está descartando de nuevo."
    )
    assert cau.paralelo_con in ordenes


def test_pais_vasco_gas_acometida_es_paralela_a_certificado_instalacion(clasificador):
    params = ClasificadorInput(
        tipo_instalacion="gas_baja_presion",
        comunidad="pais_vasco",
        potencia_kw=30,
        uso="residencial",
        presion_bar="normal",
    )
    res = clasificador.clasificar(params)
    tramites_por_orden = {t.orden: t for t in res.tramites}
    acometida = next(t for t in res.tramites if "acometida" in (t.nombre or "").lower())
    assert acometida.paralelo_con is not None
    assert "certificado de instalación" in (tramites_por_orden[acometida.paralelo_con].nombre or "").lower()
