import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.boe_pipeline import es_relevante, analizar_con_deepseek

# Documento real: RD 244/2019 de autoconsumo — sabemos que es relevante
TITULO_TEST = "Real Decreto 244/2019, de 5 de abril, por el que se regulan las condiciones administrativas, técnicas y económicas del autoconsumo de energía eléctrica"

TEXTO_TEST = """
Este real decreto regula las condiciones administrativas, técnicas y económicas
del autoconsumo de energía eléctrica. Se establecen los trámites necesarios para
la inscripción en el registro de autoconsumo, los requisitos para la conexión a red
de las instalaciones fotovoltaicas, y las condiciones para la compensación de excedentes.
Los instaladores autorizados deberán presentar el certificado de instalación eléctrica
ante la Consejería de Industria correspondiente. Las instalaciones de baja tensión
inferiores a 10kW quedan exentas de proyecto técnico.
"""

async def main():
    print("Test 1 — Filtro de palabras clave:")
    resultado = es_relevante(TITULO_TEST)
    assert resultado == True, "ERROR: El filtro no detectó documento relevante"
    print(f"  OK — Documento relevante detectado correctamente")

    print("\nTest 2 — Análisis con DeepSeek:")
    analisis = await analizar_con_deepseek(TITULO_TEST, TEXTO_TEST)
    print(f"  Relevante: {analisis.get('es_relevante')}")
    print(f"  Resumen: {analisis.get('resumen')}")
    print(f"  Tipos afectados: {analisis.get('tipos_instalacion_afectados')}")
    print(f"  Urgencia: {analisis.get('nivel_urgencia')}")
    assert analisis.get("es_relevante") == True, "ERROR: DeepSeek no detectó documento relevante"
    print("\n  Todos los tests pasaron. Pipeline listo para producción.")

if __name__ == "__main__":
    asyncio.run(main())
