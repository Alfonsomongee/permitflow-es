from pydantic import BaseModel, Field
from typing import List, Optional

class InformeSimulacionIA(BaseModel):
    # Hereda la etiqueta si se basa en incentivos autonómicos no verificados
    generica_pendiente_url: bool = Field(
        default=False, 
        description="Indica si la simulación se basa en incentivos autonómicos no verificados con una URL fuente."
    )
    supuestos_utilizados: List[str] = Field(
        default_factory=list,
        description="Lista de supuestos asumidos por la IA durante el cálculo del ROI o dimensionamiento."
    )
    
    # Otros campos que podría tener un informe de simulación
    inversion_estimada: float = Field(..., description="Coste total estimado de la instalación")
    ahorro_anual_estimado: float = Field(..., description="Ahorro económico anual estimado")
    roi_anos: float = Field(..., description="Retorno de la inversión en años")
    potencia_recomendada_kw: float = Field(..., description="Potencia fotovoltaica recomendada a instalar")

async def generar_informe_simulacion(datos_factura: dict, region: Optional[str] = None) -> InformeSimulacionIA:
    """
    Función orquestadora para generar el informe con IA a partir de los datos extraídos.
    """
    from servicios.ai_client import completar_estructurado
    import json
    
    prompt = (
        f"Genera un informe de simulación energética para una instalación fotovoltaica residencial.\n"
        f"Datos de partida:\n{json.dumps(datos_factura, indent=2)}\n"
        f"Región/Comunidad Autónoma: {region or 'Desconocida'}\n\n"
        f"Ten en cuenta los precios promedio del mercado para paneles e inversores.\n"
        f"Si la región es conocida pero no tienes una URL de la convocatoria de subvención oficial, marca 'generica_pendiente_url' como true.\n"
        f"Enumera los supuestos utilizados."
    )
    
    system = "Eres un experto en energía solar fotovoltaica y análisis financiero."
    
    informe = await completar_estructurado(
        prompt=prompt,
        schema=InformeSimulacionIA,
        system=system,
        reintentos_validacion=2
    )
    
    return informe
