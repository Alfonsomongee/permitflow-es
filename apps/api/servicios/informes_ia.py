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
        "verified",
        "pending_verification",
    ]
    fuente: Optional[str] = None


class EscenarioAhorro(BaseModel):
    nombre: str
    coste_inicial: float = Field(gt=0)
    ahorro_anual: float = Field(ge=0)
    ahorro_5_anios: float = Field(ge=0)
    ahorro_10_anios: float = Field(ge=0)
    # Optional: None significa "sin retorno con estos parámetros", que no es
    # lo mismo que 0 años (auditoría integral 2026-08-11, I-02).
    tiempo_retorno_anios: Optional[float] = Field(default=None, ge=0)
    potencia_kwp: float = Field(gt=0)
    produccion_anual_estimada_kwh: Optional[float] = None
    factura_actual_anual: float = Field(default=0.0, ge=0)
    factura_con_instalacion_anual: float = Field(default=0.0, ge=0)


class InformeSimulacionIA(BaseModel):
    supuestos_utilizados: List[SupuestoUtilizado] = Field(default_factory=list)
    incentivos_fiscales: List[Incentivo] = Field(default_factory=list)
    escenarios: List[EscenarioAhorro] = Field(default_factory=list)
    recomendacion_final: str = ""


class _InformeTextoIA(BaseModel):
    """Subconjunto del informe que SÍ delegamos al LLM: solo texto (incentivos
    fiscales conocidos y una recomendación en lenguaje natural). El LLM nunca
    ve ni decide cifras de ahorro/coste/payback — esas vienen siempre del
    motor determinista de calculo_financiero.py."""

    incentivos_fiscales: List[Incentivo] = Field(default_factory=list)
    recomendacion_final: str = ""


async def generar_informe_simulacion(
    datos_factura: dict,
    region: Optional[str] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
) -> InformeSimulacionIA:
    """
    Genera el informe de simulacion energetica.

    Las cifras (potencia recomendada, coste, ahorro, payback) las calcula
    SIEMPRE calculo_financiero.calcular_escenario_fv() con fórmulas deterministas
    y auditables — nunca un LLM. Si se dan coordenadas, la producción específica
    (kWh/kWp/año) se obtiene de PVGIS (dato real, no estimado); si no, se usa un
    punto medio orientativo para España peninsular, marcado como tal.

    El LLM (si está configurado) se usa únicamente para redactar una
    recomendación en lenguaje natural y listar incentivos fiscales conocidos
    por región, ambos como texto — nunca como fuente de una cifra financiera.
    Si el LLM falla, el informe se devuelve igualmente con el escenario
    determinista y una recomendación por defecto: el fallo de un texto
    generativo no debe tumbar el cálculo financiero, que es lo que el
    cliente necesita para decidir.
    """
    from servicios.calculo_financiero import calcular_escenario_fv
    from servicios.ai_client import completar_estructurado

    consumo = datos_factura.get("consumo_anual_kwh") or 0
    potencia = datos_factura.get("potencia_contratada_kw") or 0
    fuente_dato_factura = datos_factura.get("fuente_dato", "estimado")
    # Solo presente si el origen fue un export CSV de Datadis con los 12
    # meses cubiertos (ver servicios/datadis_parser.py). None para PDF.
    consumo_mensual = datos_factura.get("consumo_mensual_kwh")

    produccion_especifica = None
    produccion_fuente: Literal["pvgis", "estimado_espana"] = "estimado_espana"
    produccion_mensual_1kwp = None
    if lat is not None and lon is not None:
        from servicios.pvgis_client import consultar_pvgis_mensual

        pvgis = await consultar_pvgis_mensual(lat, lon)
        if pvgis and pvgis.get("produccion_especifica_kwh_kwp_year"):
            produccion_especifica = pvgis["produccion_especifica_kwh_kwp_year"]
            produccion_fuente = "pvgis"
            produccion_mensual_1kwp = pvgis.get("produccion_mensual_kwh")

    escenario_calculado = calcular_escenario_fv(
        consumo_anual_kwh=consumo,
        potencia_contratada_kw=potencia,
        produccion_especifica_kwh_kwp_year=produccion_especifica,
        produccion_especifica_fuente=produccion_fuente,
        consumo_mensual_kwh=consumo_mensual,
        produccion_mensual_kwh_1kwp=produccion_mensual_1kwp,
    )

    supuestos_utilizados = [
        SupuestoUtilizado(
            parametro=s.parametro,
            valor_asumido=s.valor_asumido,
            razon=s.razon,
            fuente_dato=s.fuente_dato,
        )
        for s in escenario_calculado.supuestos
    ]
    supuestos_utilizados.append(
        SupuestoUtilizado(
            parametro="consumo_anual_kwh",
            valor_asumido=str(consumo),
            razon="Extraído de la factura eléctrica subida por el usuario.",
            fuente_dato="leido" if fuente_dato_factura == "leido" else "estimado",
        )
    )

    escenario = EscenarioAhorro(
        nombre=escenario_calculado.nombre,
        coste_inicial=escenario_calculado.coste_inicial,
        ahorro_anual=escenario_calculado.ahorro_anual,
        ahorro_5_anios=escenario_calculado.ahorro_5_anios,
        ahorro_10_anios=escenario_calculado.ahorro_10_anios,
        tiempo_retorno_anios=escenario_calculado.tiempo_retorno_anios,
        potencia_kwp=escenario_calculado.potencia_kwp,
        produccion_anual_estimada_kwh=escenario_calculado.produccion_anual_estimada_kwh,
        factura_actual_anual=escenario_calculado.factura_actual_anual,
        factura_con_instalacion_anual=escenario_calculado.factura_con_instalacion_anual,
    )

    texto = _InformeTextoIA(
        recomendacion_final=(
            f"Con un consumo anual de {consumo:.0f} kWh, una instalación de "
            f"{escenario.potencia_kwp:.1f} kWp permitiría un ahorro estimado de "
            f"{escenario.ahorro_anual:.0f} €/año"
            + (
                f", con un retorno en {escenario.tiempo_retorno_anios:.1f} años"
                if escenario.tiempo_retorno_anios is not None
                else ". Con estos parámetros no se alcanza el retorno de la inversión"
            )
            + ". Cifras orientativas: confirma precios reales con un instalador "
            "antes de decidir."
        )
    )

    try:
        prompt = (
            f"Contexto (ya calculado, NO lo recalcules): consumo anual "
            f"{consumo:.0f} kWh, región/CCAA {region or 'desconocida'}, "
            f"instalación recomendada {escenario.potencia_kwp:.1f} kWp, "
            f"ahorro anual estimado {escenario.ahorro_anual:.0f} €.\n\n"
            f"Tarea: 1) lista incentivos fiscales/subvenciones que conozcas para "
            f"autoconsumo fotovoltaico residencial en esa región (si no conoces "
            f"ninguno específico de la región, usa nivel_verificacion="
            f"'pending_verification' y dilo en la descripción). "
            f"2) Escribe una recomendación final breve en lenguaje natural. "
            f"NO incluyas cifras de ahorro/coste/payback distintas a las ya dadas: "
            f"no calculas tú esos números.\n\n"
            f"Devuelve JSON valido con la estructura exacta del schema."
        )
        system = (
            "Eres un asistente que redacta texto informativo sobre incentivos "
            "fiscales de autoconsumo fotovoltaico en España. No calculas cifras "
            "financieras: esas ya vienen dadas. NUNCA inventes una convocatoria "
            "o importe que no puedas justificar."
        )
        texto = await completar_estructurado(
            prompt=prompt,
            schema=_InformeTextoIA,
            system=system,
            reintentos_validacion=1,
        )
    except Exception:
        # El texto generativo es un complemento, no el producto. Si el LLM
        # falla (timeout, cuota, JSON inválido tras reintentos), el informe
        # se sirve igualmente con el escenario determinista ya calculado.
        pass

    return InformeSimulacionIA(
        supuestos_utilizados=supuestos_utilizados,
        incentivos_fiscales=texto.incentivos_fiscales,
        escenarios=[escenario],
        recomendacion_final=texto.recomendacion_final,
    )
