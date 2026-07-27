"""Informe de Simulacion IA

Schema Pydantic que define exactamente lo que el backend devuelve.
Este archivo es la fuente de verdad del contrato.

IMPORTANTE: cualquier cambio aqui debe reflejarse en:
  - apps/web/types/simulador.ts (manualmente hasta que se active openapi-typescript)
  - Un test de contrato en tests/test_simulador.py
"""
from pydantic import BaseModel, Field
from typing import Literal, Optional, List


class SupuestoUtilizado(BaseModel):
    parametro: str
    valor_asumido: str | float
    razon: str
    fuente_dato: Literal["leido", "estimado"] = "estimado"


class Incentivo(BaseModel):
    nombre: str
    descripcion: str
    ahorro_estimado: float = Field(ge=0)
    nivel_verificacion: Literal[
        "exacta_factura",
        "estimada_datos",
        "generica_pendiente_url",
    ]
    fuente: Optional[str] = None


class EscenarioAhorro(BaseModel):
    nombre: str
    coste_inicial: float = Field(gt=0)
    ahorro_anual: float = Field(ge=0)
    tiempo_retorno_anios: float = Field(ge=0)
    produccion_anual_estimada_kwh: Optional[float] = None


class InformeSimulacionIA(BaseModel):
    supuestos_utilizados: List[SupuestoUtilizado] = Field(default_factory=list)
    incentivos_fiscales: List[Incentivo] = Field(default_factory=list)
    escenarios: List[EscenarioAhorro] = Field(default_factory=list)
    recomendacion_final: str = ""


async def generar_informe_simulacion(
    datos_factura: dict,
    region: Optional[str] = None,
) -> InformeSimulacionIA:
    """
    Genera el informe de simulacion energetica con IA.

    Los costes de instalacion se calcularan desde CatalogoComponente
    cuando la tabla este poblada (Bloque 4 del plan). Mientras tanto
    se usan rangos de mercado declarados como estimaciones.
    """
    from servicios.ai_client import completar_estructurado
    import json

    consumo = datos_factura.get("consumo_anual_kwh", 0)
    potencia = datos_factura.get("potencia_contratada_kw", 0)
    fuente_dato = datos_factura.get("fuente_dato", "estimado")

    # Cotas fisicas minimas: el ahorro nunca puede superar el consumo total.
    # Precio estimado por kWh (pendiente de tabla ParametroEconomico con fuente).
    PRECIO_KWH_ESTIMADO = 0.18  # EUR/kWh — media peninsular 2024, CNMC
    ahorro_maximo_posible = consumo * PRECIO_KWH_ESTIMADO

    prompt = (
        f"Genera un informe de simulacion energetica fotovoltaica residencial.\n"
        f"Datos de partida:\n"
        f"  - Consumo anual: {consumo} kWh (fuente: {fuente_dato})\n"
        f"  - Potencia contratada: {potencia} kW\n"
        f"  - Region/CCAA: {region or 'desconocida'}\n"
        f"  - Ahorro maximo fisicamente posible: {ahorro_maximo_posible:.0f} EUR/ano\n\n"
        f"Restricciones que DEBES cumplir:\n"
        f"  1. El campo 'ahorro_anual' de cualquier escenario NO puede superar {ahorro_maximo_posible:.0f} EUR.\n"
        f"  2. El campo 'coste_inicial' DEBE ser mayor que 0 (no dividas por cero).\n"
        f"  3. El campo 'tiempo_retorno_anios' = coste_inicial / ahorro_anual.\n"
        f"  4. Si los datos de consumo son estimados, refleja la incertidumbre en los supuestos.\n"
        f"  5. Si la region es conocida, incluye incentivos autonómicos reales. "
        f"Si no tienes URL de convocatoria, usa nivel_verificacion='generica_pendiente_url'.\n\n"
        f"Devuelve siempre JSON valido con la estructura exacta del schema."
    )

    system = (
        "Eres un experto en energia solar fotovoltaica residencial en Espana. "
        "Generas informes de simulacion con datos reales del mercado espanol. "
        "NUNCA inventes numeros que no puedas justificar. "
        "Si no tienes datos de una CCAA, dilo en los supuestos."
    )

    informe = await completar_estructurado(
        prompt=prompt,
        schema=InformeSimulacionIA,
        system=system,
        reintentos_validacion=2,
    )

    return informe
