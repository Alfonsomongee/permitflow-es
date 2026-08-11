"""Comprobaciones de coherencia física entre los parámetros declarados.

Origen: auditoría QA 2026-08-11, hallazgos C-03 y M-02. El formulario pedía la
superficie del generador diciendo que servía "para verificar la coherencia con
la potencia", pero esa comprobación no existía en ninguna parte: 1 m² con 100 kW
se aceptaba sin una sola advertencia.

Estas comprobaciones son **advertencias, no errores**. El motor no conoce el
proyecto real y hay casos legítimos fuera de los rangos habituales (módulos de
alta eficiencia, superficie declarada solo de una parte del campo solar,
instalaciones con sombreado que se separan más de lo normal). Bloquear sería
peor que avisar: el objetivo es que un dedazo evidente no pase inadvertido, no
arrogarse una precisión que no tenemos.

Los umbrales son deliberadamente laxos. Se prefiere no avisar sobre un caso raro
pero real que inundar de falsos positivos: un aviso que salta cuando no toca deja
de leerse, y entonces tampoco sirve cuando sí toca.
"""

from typing import Optional

# Un módulo fotovoltaico comercial ronda los 200-230 W/m², así que 1 kWp ocupa
# unos 4,5-5 m² de módulo. Con separación entre filas y estructura, lo habitual
# en cubierta es 5-8 m²/kW. Por debajo de 2,5 m²/kW no cabe físicamente ni con
# los módulos más eficientes del mercado, así que ahí sí hay un error de dato.
MIN_M2_POR_KW_FV = 2.5

# Por encima de este ratio la superficie declarada es tan grande respecto a la
# potencia que casi siempre significa que se ha introducido la superficie de la
# parcela o de la cubierta entera en vez de la del generador.
MAX_M2_POR_KW_FV = 40.0

# Tolerancia al comparar la potencia total declarada con la suma de los puntos
# de recarga: cubre redondeos y potencias nominales frente a las reales.
TOLERANCIA_IRVE = 0.15


def _num(valor: object) -> Optional[float]:
    """Devuelve el valor como magnitud utilizable, o None si no lo es.

    Se descartan los booleanos (en Python `True` es instancia de `int`) y los
    valores no positivos: un 0 en estos campos significa "no informado", no una
    superficie de 0 m². Los negativos no deberían llegar —el schema los rechaza—
    pero tratarlos como ausentes evita emitir un aviso desconcertante si lo hacen.
    """
    if isinstance(valor, bool) or valor is None:
        return None
    if isinstance(valor, (int, float)) and valor > 0:
        return float(valor)
    return None


def comprobar_coherencia(datos: dict) -> list[str]:
    """Devuelve la lista de advertencias de coherencia para estos parámetros.

    Recibe el dict ya normalizado por el clasificador. Nunca lanza: si falta un
    dato, esa comprobación sencillamente no aplica.
    """
    avisos: list[str] = []
    tipo = datos.get("tipo_instalacion")
    potencia = _num(datos.get("potencia_kw"))
    superficie = _num(datos.get("superficie_m2"))

    if tipo == "fotovoltaica_autoconsumo" and potencia and superficie:
        ratio = superficie / potencia
        if ratio < MIN_M2_POR_KW_FV:
            avisos.append(
                f"La superficie declarada ({superficie:g} m²) es demasiado pequeña para "
                f"{potencia:g} kW: harían falta al menos unos {potencia * MIN_M2_POR_KW_FV:.0f} m² "
                "de módulos. Revisa si has introducido la potencia pico de los paneles en vez "
                "de la nominal del inversor, o la superficie de solo una parte del generador."
            )
        elif ratio > MAX_M2_POR_KW_FV:
            avisos.append(
                f"La superficie declarada ({superficie:g} m²) es muy grande para {potencia:g} kW. "
                "Si has introducido la superficie total de la cubierta o de la parcela, indica "
                "solo la ocupada por los módulos: el dato se usa para contrastar la potencia."
            )

    if tipo == "irve":
        puntos = _num(datos.get("numero_puntos"))
        por_punto = _num(datos.get("potencia_por_punto_kw"))
        if potencia and puntos and por_punto:
            suma = puntos * por_punto
            if suma > 0 and abs(suma - potencia) / max(suma, potencia) > TOLERANCIA_IRVE:
                avisos.append(
                    f"La potencia total declarada ({potencia:g} kW) no cuadra con los puntos de "
                    f"recarga indicados ({puntos:g} × {por_punto:g} kW = {suma:g} kW). Revisa "
                    "cuál de los dos datos es el correcto: la potencia determina el tipo de "
                    "trámite y el umbral de proyecto técnico."
                )

    return avisos
