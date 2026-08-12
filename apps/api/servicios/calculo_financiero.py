"""Motor de cálculo financiero determinista para el Simulador AI.

Sustituye la parte numérica de generar_informe_simulacion (antes delegada
enteramente a un LLM sin motor de cálculo auditable) por fórmulas fijas y
trazables. El LLM, si se usa, queda limitado a texto (incentivos fiscales,
recomendación final) y nunca decide una cifra de ahorro, coste o payback.

Todas las constantes de mercado (no normativas) están explícitamente marcadas
como estimadas y traen su fuente cuando existe una verificada. Se han portado
desde apps/web/content/benchmarks_fv.ts para no duplicar números divergentes
entre el simulador de "Orientación" (frontend) y el Simulador AI (backend).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal, Optional


# ─── Constantes de mercado (portadas de content/benchmarks_fv.ts) ─────────────
# Mantener ambos ficheros sincronizados si se actualiza uno de los dos.

PRECIO_KWH_EUR = 0.261
PRECIO_KWH_FUENTE = (
    "Eurostat, nrg_pc_204 (doméstico España, banda DC 2.500-5.000 kWh, "
    "impuestos incluidos), S1 2025"
)

COSTE_EUR_KWP_RESIDENCIAL_MIN = 900.0
COSTE_EUR_KWP_RESIDENCIAL_MAX = 1400.0
COSTE_KWP_NOTA = (
    "Horquilla de mercado no verificada con proveedores reales (referencia "
    "administrativa más cercana: RD 477/2021 Anexo III, tope subvencionable "
    "1.188 €/kWp para P<=10 kWp, que NO es un precio de mercado)."
)

RATIO_AUTOCONSUMO_MIN = 0.2
RATIO_AUTOCONSUMO_MAX = 0.4
RATIO_AUTOCONSUMO_NOTA = (
    "Ratio de autoconsumo directo sin batería, horquilla del sector no "
    "verificada con datos de monitorización reales."
)

# Producción específica media orientativa para España peninsular cuando no se
# dispone de coordenadas para consultar PVGIS. PVGIS documenta un rango real de
# ~1.100 (norte) a ~1.700 (sur) kWh/kWp/año; 1.400 es un punto medio razonable,
# NO una medición, y así se etiqueta en la salida.
PRODUCCION_ESPECIFICA_ESPANA_KWH_KWP_ANO = 1400.0

# Límites de dimensionamiento residencial (evita recomendar 0.3 kWp o 40 kWp
# a partir de una extrapolación lineal sin sentido para una vivienda).
KWP_MIN_RESIDENCIAL = 1.5
KWP_MAX_RESIDENCIAL = 10.0


@dataclass
class SupuestoCalculo:
    parametro: str
    valor_asumido: str
    razon: str
    fuente_dato: Literal["leido", "estimado"] = "estimado"


@dataclass
class EscenarioCalculado:
    nombre: str
    coste_inicial: float
    ahorro_anual: float
    ahorro_5_anios: float
    ahorro_10_anios: float
    tiempo_retorno_anios: Optional[float]
    potencia_kwp: float
    produccion_anual_estimada_kwh: float
    # Coste de la factura eléctrica anual sin y con la instalación, en euros.
    # Antes el informe solo mostraba el ahorro (una cifra derivada) sin nunca
    # dibujar la factura real de la que sale: el usuario no podía ver "pagas
    # X hoy, pagarías Y con la instalación", solo un número de ahorro
    # desconectado de su factura. Se calculan aquí (no en el frontend) para
    # que salgan de la misma fórmula trazable que el resto del escenario.
    factura_actual_anual: float = 0.0
    factura_con_instalacion_anual: float = 0.0
    supuestos: list[SupuestoCalculo] = field(default_factory=list)


def _redondear(valor: float, decimales: int = 0) -> float:
    return round(valor, decimales)


def calcular_escenario_fv(
    consumo_anual_kwh: float,
    potencia_contratada_kw: Optional[float] = None,
    produccion_especifica_kwh_kwp_year: Optional[float] = None,
    produccion_especifica_fuente: Literal["pvgis", "estimado_espana"] = "estimado_espana",
    precio_kwh: Optional[float] = None,
    consumo_mensual_kwh: Optional[list[float]] = None,
    produccion_mensual_kwh_1kwp: Optional[list[float]] = None,
) -> EscenarioCalculado:
    """Calcula un escenario de autoconsumo fotovoltaico residencial con
    fórmulas deterministas y auditables. No usa LLM en ningún paso numérico.

    Fórmulas (todas trazables, ver `supuestos` en el resultado):
      1. kwp_recomendada = consumo_anual_kwh / produccion_especifica, acotado
         a un rango residencial razonable [1.5, 10] kWp.
      2. produccion_anual_kwh = kwp_recomendada * produccion_especifica.
      3. energia_autoconsumida_kwh: por defecto, min(produccion_anual_kwh *
         ratio_autoconsumo, consumo_anual_kwh) — nunca se autoconsume más de
         lo que se consume. Si se dan consumo_mensual_kwh (12 valores reales,
         p.ej. de un export de Datadis) y produccion_mensual_kwh_1kwp (12
         valores de PVGIS a 1 kWp), el ratio_autoconsumo se aplica sobre la
         suma de min(producción_mes, consumo_mes) mes a mes en vez de sobre
         el total anual: un mes con poco consumo (p.ej. una segunda
         residencia en invierno) no puede "compensarse" con la producción
         de otro mes, que es lo que la fórmula anual sí permitía sin darse
         cuenta. El ratio de simultaneidad intradía sigue siendo una
         estimación (ver RATIO_AUTOCONSUMO_NOTA) -- esto solo corrige la
         parte de la estimación que SÍ podemos verificar con datos reales.
      4. ahorro_anual = energia_autoconsumida_kwh * precio_kwh.
      5. coste_inicial = kwp_recomendada * coste_eur_kwp (punto medio de la
         horquilla de mercado).
      6. tiempo_retorno_anios = coste_inicial / ahorro_anual.
    """
    if consumo_anual_kwh is None or consumo_anual_kwh <= 0:
        raise ValueError("consumo_anual_kwh debe ser mayor que 0 para calcular un escenario.")

    precio = precio_kwh if precio_kwh is not None else PRECIO_KWH_EUR
    produccion_especifica = (
        produccion_especifica_kwh_kwp_year
        if produccion_especifica_kwh_kwp_year is not None
        else PRODUCCION_ESPECIFICA_ESPANA_KWH_KWP_ANO
    )

    kwp_bruta = consumo_anual_kwh / produccion_especifica
    kwp_recomendada = max(KWP_MIN_RESIDENCIAL, min(KWP_MAX_RESIDENCIAL, kwp_bruta))

    produccion_anual_kwh = kwp_recomendada * produccion_especifica

    ratio_autoconsumo = (RATIO_AUTOCONSUMO_MIN + RATIO_AUTOCONSUMO_MAX) / 2

    usar_matching_mensual = (
        consumo_mensual_kwh is not None
        and len(consumo_mensual_kwh) == 12
        and produccion_mensual_kwh_1kwp is not None
        and len(produccion_mensual_kwh_1kwp) == 12
    )

    if usar_matching_mensual:
        produccion_mensual_kwh = [p * kwp_recomendada for p in produccion_mensual_kwh_1kwp]
        techo_mensual_kwh = sum(
            min(prod_mes, cons_mes)
            for prod_mes, cons_mes in zip(produccion_mensual_kwh, consumo_mensual_kwh)
        )
        energia_autoconsumida_kwh = min(techo_mensual_kwh * ratio_autoconsumo, consumo_anual_kwh)
    else:
        energia_autoconsumida_kwh = min(
            produccion_anual_kwh * ratio_autoconsumo, consumo_anual_kwh
        )

    ahorro_anual = energia_autoconsumida_kwh * precio

    coste_eur_kwp = (COSTE_EUR_KWP_RESIDENCIAL_MIN + COSTE_EUR_KWP_RESIDENCIAL_MAX) / 2
    coste_inicial = kwp_recomendada * coste_eur_kwp

    # None, no 0. Un payback de "0 años" se lee como retorno instantáneo cuando
    # significa justo lo contrario: que con estos parámetros no hay retorno.
    # Es el mismo error que ya se corrigió en el motor normativo con
    # "~0 días estimados" — confundir ausencia de dato con valor cero
    # (auditoría integral 2026-08-11, I-02).
    tiempo_retorno = coste_inicial / ahorro_anual if ahorro_anual > 0 else None

    # Factura actual = todo el consumo anual al precio medio; factura con
    # instalación = la misma factura menos lo que deja de comprarse a la red
    # (ahorro_anual). No resta más que el propio consumo (max 0) para no
    # mostrar una factura negativa si algún día ahorro_anual > factura_actual
    # por un precio_kwh manual atípico.
    factura_actual_anual = consumo_anual_kwh * precio
    factura_con_instalacion_anual = max(factura_actual_anual - ahorro_anual, 0.0)

    supuestos = [
        SupuestoCalculo(
            parametro="produccion_especifica_kwh_kwp_year",
            valor_asumido=f"{produccion_especifica:.0f} kWh/kWp/año",
            razon=(
                "Dato real de PVGIS (JRC) para la ubicación de la instalación."
                if produccion_especifica_fuente == "pvgis"
                else (
                    "Sin coordenadas de la instalación: se usa un punto medio "
                    "orientativo para España peninsular (PVGIS documenta un rango "
                    "real de ~1.100 a ~1.700 según ubicación)."
                )
            ),
            fuente_dato="leido" if produccion_especifica_fuente == "pvgis" else "estimado",
        ),
        SupuestoCalculo(
            parametro="precio_kwh_eur",
            valor_asumido=f"{precio:.3f} €/kWh",
            razon=PRECIO_KWH_FUENTE,
            fuente_dato="leido" if precio_kwh is None else "estimado",
        ),
        SupuestoCalculo(
            parametro="coste_eur_por_kwp",
            valor_asumido=f"{coste_eur_kwp:.0f} €/kWp",
            razon=COSTE_KWP_NOTA,
            fuente_dato="estimado",
        ),
        SupuestoCalculo(
            parametro="ratio_autoconsumo_sin_bateria",
            valor_asumido=f"{ratio_autoconsumo:.0%}",
            razon=(
                (
                    RATIO_AUTOCONSUMO_NOTA
                    + " El propio porcentaje sigue siendo una horquilla de "
                    "mercado, pero se aplica sobre el mínimo mensual real "
                    "entre producción y consumo (ver siguiente supuesto), no "
                    "sobre el total anual."
                )
                if usar_matching_mensual
                else RATIO_AUTOCONSUMO_NOTA
            ),
            fuente_dato="estimado",
        ),
        SupuestoCalculo(
            parametro="potencia_kwp_recomendada",
            valor_asumido=f"{kwp_recomendada:.2f} kWp",
            razon=(
                f"consumo_anual_kwh / producción específica, acotado a un rango "
                f"residencial de {KWP_MIN_RESIDENCIAL}-{KWP_MAX_RESIDENCIAL} kWp."
            ),
            fuente_dato="estimado",
        ),
    ]

    if usar_matching_mensual:
        supuestos.append(
            SupuestoCalculo(
                parametro="perfil_mensual_consumo",
                valor_asumido="12 meses (histórico real)",
                razon=(
                    "Consumo real mes a mes (p.ej. de un export de Datadis), "
                    "cruzado con la producción mensual de PVGIS para esta "
                    "ubicación. Evita sobreestimar el autoconsumo en meses "
                    "de bajo consumo con la producción de otros meses."
                ),
                fuente_dato="leido",
            )
        )

    supuestos.append(
        SupuestoCalculo(
            parametro="factura_actual_anual_eur",
            valor_asumido=f"{factura_actual_anual:.0f} €/año",
            razon=(
                "consumo_anual_kwh × precio_kwh_eur -- la factura eléctrica "
                "anual sin instalación, calculada con el mismo precio medio "
                "usado para el ahorro (no es un importe leído literalmente de "
                "la factura, que incluye término de potencia y otros cargos "
                "fijos no modelados aquí)."
            ),
            fuente_dato="leido" if usar_matching_mensual else "estimado",
        )
    )

    return EscenarioCalculado(
        nombre="Autoconsumo fotovoltaico residencial",
        coste_inicial=_redondear(coste_inicial, 2),
        ahorro_anual=_redondear(ahorro_anual, 2),
        ahorro_5_anios=_redondear(ahorro_anual * 5, 2),
        ahorro_10_anios=_redondear(ahorro_anual * 10, 2),
        tiempo_retorno_anios=_redondear(tiempo_retorno, 1) if tiempo_retorno is not None else None,
        potencia_kwp=_redondear(kwp_recomendada, 2),
        produccion_anual_estimada_kwh=_redondear(produccion_anual_kwh, 0),
        factura_actual_anual=_redondear(factura_actual_anual, 2),
        factura_con_instalacion_anual=_redondear(factura_con_instalacion_anual, 2),
        supuestos=supuestos,
    )
