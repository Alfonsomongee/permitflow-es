"""
apps/api/servicios/ayudas.py

Servicio determinista del "simulador de ayudas y subvenciones".

Reutiliza el catalogo de servicios/catalogo_ayudas.py (investigado manualmente,
sin API en vivo) y aplica una logica de presentacion honesta: en vez de decir
"tienes derecho a X euros", el servicio devuelve el estado real de cada
programa (vigente/agotado/en_ejecucion/cerrado) y su nivel de fiabilidad, para
que el usuario sepa exactamente que puede confiar y que debe verificar.

No hay ningun calculo de "cuantia estimada para tu caso": las ayudas publicas
tienen formulas y topes demasiado heterogeneos (EUR/kWp, EUR/kW, % variable,
topes por vivienda) como para modelarlos de forma fiable sin el texto legal
completo de cada convocatoria. Se muestra el resumen_cuantia tal cual esta
documentado en la fuente, nunca un numero inventado para el caso concreto.
"""

from dataclasses import dataclass

from servicios.catalogo_ayudas import Ayuda, EstadoAyuda, buscar_ayudas

# Orden de prioridad para mostrar primero lo mas accionable
_ORDEN_ESTADO: dict[EstadoAyuda, int] = {
    "vigente": 0,
    "agotado": 1,
    "en_ejecucion": 2,
    "cerrado": 3,
    "no_localizado": 4,
}


@dataclass(frozen=True)
class ResultadoAyudas:
    comunidad: str
    vertical: str
    ayudas: list[Ayuda]
    hay_alguna_vigente: bool
    aviso: str


def simular_ayudas(comunidad: str, vertical: str) -> ResultadoAyudas:
    """
    Devuelve todas las ayudas conocidas (estatales + autonomicas) para la
    combinacion comunidad/vertical, ordenadas por relevancia (vigente primero).

    Si no hay ninguna entrada en el catalogo, se devuelve una lista vacia con
    un aviso explicito de "sin programa localizado" en vez de omitir el campo
    silenciosamente.
    """
    encontradas = buscar_ayudas(comunidad, vertical)
    encontradas_ordenadas = sorted(encontradas, key=lambda a: _ORDEN_ESTADO[a.estado])

    hay_alguna_vigente = any(a.estado == "vigente" for a in encontradas_ordenadas)

    if not encontradas_ordenadas:
        aviso = (
            "No se ha localizado ningun programa de ayuda publica (estatal o autonomico) "
            "para esta combinacion de comunidad y tecnologia en nuestra investigacion de julio de 2026. "
            "Esto no significa que no exista ayuda alguna: puede haber convocatorias municipales, "
            "provinciales o de nueva creacion no cubiertas todavia. Consulta con el ayuntamiento o la "
            "agencia energetica autonomica correspondiente."
        )
    elif hay_alguna_vigente:
        aviso = (
            "Hay al menos un programa con plazo de solicitud abierto segun nuestra ultima verificacion. "
            "Antes de tramitar, confirma en la fuente oficial que el plazo sigue abierto y que tu caso "
            "cumple los requisitos exactos de la convocatoria."
        )
    else:
        aviso = (
            "Ninguno de los programas localizados tiene actualmente un plazo de solicitud abierto "
            "(estan cerrados, agotados o en fase de ejecucion de expedientes ya concedidos). "
            "Se muestran igualmente como referencia de que tipo de ayudas ha habido, por si reabren "
            "convocatoria."
        )

    return ResultadoAyudas(
        comunidad=comunidad,
        vertical=vertical,
        ayudas=encontradas_ordenadas,
        hay_alguna_vigente=hay_alguna_vigente,
        aviso=aviso,
    )
