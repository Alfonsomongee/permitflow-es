"""
test_pipeline.py v2 — PermitFlow ES
Prueba la API oficial del BOE, el análisis con DeepSeek y la conexión Supabase.
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.boe_pipeline import (
    es_relevante,
    analizar_con_deepseek,
    descargar_boe_api_oficial,
    descargar_texto_boe_api,
    detectar_verticales,
    detectar_ccaa,
    get_supabase_client,
)

# ─── Datos de prueba ──────────────────────────────────────────────────────────

TITULO_FV = "Real Decreto 244/2019, de 5 de abril, por el que se regulan las condiciones administrativas, técnicas y económicas del autoconsumo de energía eléctrica"

TITULO_MOVES = "Resolución de 20 de febrero de 2026, de la Agencia Andaluza de la Energía, por la que se amplía el crédito máximo de la convocatoria MOVES III"

TITULO_FGAS = "Reglamento (UE) 2024/573 del Parlamento Europeo sobre gases fluorados de efecto invernadero"

TITULO_IRRELEVANTE = "Resolución de 15 de enero de 2026, de la Dirección General de Tráfico, por la que se aprueba el calendario de pruebas teóricas"

TEXTO_TEST = """
Este real decreto modifica los plazos de tramitación para instalaciones fotovoltaicas
de autoconsumo en baja tensión. Las instalaciones de hasta 15 kW quedan exentas de
solicitar permisos de acceso y conexión. El certificado de instalación eléctrica
debe presentarse ante la Delegación Territorial de Industria mediante la plataforma PUES.
El plazo de resolución se reduce de 45 a 30 días hábiles.
"""


async def main():
    errores = 0

    # ── Test 1: Filtro de palabras clave ──────────────────────────────────────
    print("\nTest 1 — Filtro de palabras clave:")

    assert es_relevante(TITULO_FV), "FALLO: No detectó fotovoltaica"
    print("  ✓ Fotovoltaica detectada")

    assert es_relevante(TITULO_MOVES), "FALLO: No detectó MOVES"
    print("  ✓ MOVES detectado")

    assert es_relevante(TITULO_FGAS), "FALLO: No detectó F-Gas"
    print("  ✓ F-Gas detectado")

    assert not es_relevante(TITULO_IRRELEVANTE), "FALLO: Falso positivo en tráfico"
    print("  ✓ Tráfico correctamente descartado")

    # ── Test 2: Detección de verticales ──────────────────────────────────────
    print("\nTest 2 — Detección de verticales:")

    verticales_fv = detectar_verticales(TITULO_FV, TEXTO_TEST)
    assert "fotovoltaica_autoconsumo" in verticales_fv, f"FALLO: {verticales_fv}"
    print(f"  ✓ Verticales FV: {verticales_fv}")

    verticales_moves = detectar_verticales(TITULO_MOVES, "")
    assert "irve" in verticales_moves, f"FALLO: {verticales_moves}"
    print(f"  ✓ Verticales MOVES: {verticales_moves}")

    # ── Test 3: Detección de CCAA ─────────────────────────────────────────────
    print("\nTest 3 — Detección de CCAA:")

    ccaa = detectar_ccaa(TITULO_MOVES, "", "BOJA")
    assert "andalucia" in ccaa, f"FALLO: {ccaa}"
    print(f"  ✓ CCAA MOVES: {ccaa}")

    # ── Test 4: API oficial del BOE ───────────────────────────────────────────
    print("\nTest 4 — API oficial del BOE (últimos 3 días):")
    try:
        docs = descargar_boe_api_oficial(dias_atras=3)
        print(f"  ✓ {len(docs)} disposiciones descargadas")
        if docs:
            print(f"    Ejemplo: {docs[0]['titulo'][:60]}...")
            # Probar descarga de texto del primero
            if docs[0].get("id"):
                texto = descargar_texto_boe_api(docs[0]["id"])
                print(f"    Texto descargado: {len(texto)} chars")
    except Exception as e:
        print(f"  ⚠ API BOE no disponible (puede ser normal en local): {e}")
        errores += 1

    # ── Test 5: Análisis con DeepSeek ─────────────────────────────────────────
    print("\nTest 5 — Análisis con DeepSeek:")
    try:
        analisis = await analizar_con_deepseek(TITULO_FV, TEXTO_TEST)
        assert analisis.get("es_relevante") is True, f"FALLO: {analisis}"
        assert "tipos_instalacion_afectados" in analisis
        assert "diff_sugerido" in analisis
        print(f"  ✓ Relevante: {analisis['es_relevante']}")
        print(f"  ✓ Urgencia: {analisis.get('nivel_urgencia')}")
        print(f"  ✓ Verticales: {analisis.get('tipos_instalacion_afectados')}")
        print(f"  ✓ Diff sugerido: {analisis['diff_sugerido'].get('descripcion', '')[:60]}")
    except Exception as e:
        print(f"  ✗ Error DeepSeek: {e}")
        errores += 1

    # ── Test 6: Conexión Supabase ─────────────────────────────────────────────
    print("\nTest 6 — Conexión Supabase:")
    supabase = get_supabase_client()
    if supabase:
        try:
            result = supabase.table("alertas_boe").select("id").limit(1).execute()
            print(f"  ✓ Supabase conectado — {len(result.data)} registros en alertas_boe")
        except Exception as e:
            print(f"  ✗ Error en Supabase: {e}")
            errores += 1
    else:
        print("  ⚠ Supabase no configurado (necesitas SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY)")

    # ── Resultado final ───────────────────────────────────────────────────────
    print(f"\n{'='*50}")
    if errores == 0:
        print("✅ Todos los tests pasaron. Pipeline v2 listo.")
    else:
        print(f"⚠  {errores} test(s) con problemas. Revisa la configuración.")
    print(f"{'='*50}\n")


if __name__ == "__main__":
    asyncio.run(main())
