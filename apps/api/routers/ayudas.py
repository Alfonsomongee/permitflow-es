from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from servicios.ayudas import simular_ayudas
from servicios.catalogo_ayudas import EstadoAyuda, Fiabilidad

router = APIRouter(prefix="/api/v1/ayudas", tags=["Ayudas"])

_COMUNIDADES_VALIDAS = {
    "andalucia", "aragon", "asturias", "baleares", "canarias", "cantabria",
    "castilla_la_mancha", "castilla_leon", "cataluna", "comunidad_valenciana",
    "extremadura", "galicia", "la_rioja", "madrid", "murcia", "navarra",
    "pais_vasco",
}
_VERTICALES_VALIDOS = {
    "fotovoltaica_autoconsumo", "irve", "climatizacion_aerotermia", "acs", "gas_baja_presion",
}


class AyudaOut(BaseModel):
    id: str
    comunidad: str | None
    vertical: str
    nombre: str
    organismo: str
    estado: EstadoAyuda
    resumen_cuantia: str
    requisitos: str
    plazo: str
    fuente_url: str
    fiabilidad: Fiabilidad
    fecha_consulta: str
    notas: str


class SimulacionAyudasOut(BaseModel):
    comunidad: str
    vertical: str
    hay_alguna_vigente: bool
    aviso: str
    ayudas: list[AyudaOut]


@router.get("/simular", response_model=SimulacionAyudasOut)
async def simular(comunidad: str, tipo_instalacion: str) -> SimulacionAyudasOut:
    """
    Devuelve el catalogo de ayudas publicas conocidas (estatales + autonomicas)
    para una comunidad y vertical dados.

    IMPORTANTE (honestidad de datos): este catalogo procede de una investigacion
    manual puntual (julio 2026), no de una fuente en vivo. Cada entrada indica su
    propio estado (vigente/agotado/en_ejecucion/cerrado/no_localizado) y nivel de
    fiabilidad (oficial/secundaria/no_verificado) — ver servicios/catalogo_ayudas.py.
    No se calcula ninguna cuantia estimada para el caso concreto del usuario:
    las formulas de cada convocatoria son demasiado heterogeneas para modelarlas
    de forma fiable sin verificar el texto legal completo.
    """
    if comunidad not in _COMUNIDADES_VALIDAS:
        raise HTTPException(status_code=422, detail=f"Comunidad autónoma no reconocida: '{comunidad}'")
    if tipo_instalacion not in _VERTICALES_VALIDOS:
        raise HTTPException(status_code=422, detail=f"Tipo de instalación no reconocido: '{tipo_instalacion}'")

    resultado = simular_ayudas(comunidad, tipo_instalacion)
    return SimulacionAyudasOut(
        comunidad=resultado.comunidad,
        vertical=resultado.vertical,
        hay_alguna_vigente=resultado.hay_alguna_vigente,
        aviso=resultado.aviso,
        ayudas=[
            AyudaOut(
                id=a.id,
                comunidad=a.comunidad,
                vertical=a.vertical,
                nombre=a.nombre,
                organismo=a.organismo,
                estado=a.estado,
                resumen_cuantia=a.resumen_cuantia,
                requisitos=a.requisitos,
                plazo=a.plazo,
                fuente_url=a.fuente_url,
                fiabilidad=a.fiabilidad,
                fecha_consulta=a.fecha_consulta,
                notas=a.notas,
            )
            for a in resultado.ayudas
        ],
    )
