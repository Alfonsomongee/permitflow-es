from fastapi import UploadFile
from pydantic import BaseModel, field_validator, ValidationError
import re
import io
import pypdf

from servicios.ai_client import completar_estructurado

class DatosFacturaIA(BaseModel):
    cups: str
    consumo_anual_kwh: float
    potencia_contratada_kw: float
    
    @field_validator("cups")
    def validar_cups(cls, v):
        patron = r'^ES[0-9]{20}[a-zA-Z]{2}[0-9A-Za-z]?$'
        if not re.match(patron, v):
            raise ValueError(f"CUPS no válido: {v}")
        return v
        
    @field_validator("potencia_contratada_kw")
    def validar_potencia(cls, v):
        if v > 50.0:
            raise ValueError(f"Potencia excesiva para residencial: {v} kW")
        if v <= 0.0:
            raise ValueError("La potencia debe ser mayor a 0.")
        return v
        
    @field_validator("consumo_anual_kwh")
    def validar_consumo(cls, v):
        if v > 50000.0:
            raise ValueError(f"Consumo excesivo: {v} kWh")
        if v <= 0.0:
            raise ValueError("El consumo debe ser mayor a 0.")
        return v

async def extraer_texto_pdf(file: UploadFile) -> str:
    contenido = await file.read()
    # Reset cursor just in case it's read again
    await file.seek(0)
    
    lector = pypdf.PdfReader(io.BytesIO(contenido))
    texto = ""
    for pagina in lector.pages:
        txt = pagina.extract_text()
        if txt:
            texto += txt + "\n"
    return texto

async def parsear_factura(file: UploadFile) -> dict:
    try:
        texto = await extraer_texto_pdf(file)
    except Exception as e:
        return {
            "estado": "no_extraido",
            "error": f"Error leyendo PDF: {e}"
        }
        
    prompt = (
        "Extrae el CUPS, consumo anual (en kWh) y potencia contratada (en kW) de la siguiente factura eléctrica.\n"
        "Si solo encuentras consumo mensual, multiplícalo o estima el anual, pero intenta buscar el dato anual.\n"
        f"Texto:\n{texto}"
    )
    system = "Eres un asistente experto extrayendo datos clave de facturas eléctricas en formato JSON."
    
    try:
        resultado = await completar_estructurado(
            prompt=prompt,
            schema=DatosFacturaIA,
            system=system,
            reintentos_validacion=2
        )
        return {
            "estado": "exitoso",
            "cups": resultado.cups,
            "consumo_anual_kwh": resultado.consumo_anual_kwh,
            "potencia_contratada_kw": resultado.potencia_contratada_kw
        }
    except ValidationError as e:
        return {
            "estado": "no_extraido",
            "error": "Fallo de validación estricta",
            "detalle": str(e)
        }
    except Exception as e:
        return {
            "estado": "no_extraido",
            "error": str(e)
        }
