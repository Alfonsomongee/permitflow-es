"""Schemas Pydantic para el endpoint de idoneidad geográfica."""

from pydantic import BaseModel, Field
from typing import Optional


class IdoneidadInput(BaseModel):
    municipio: str = Field(..., description="Nombre del municipio", min_length=1)
    provincia: str = Field(..., description="Nombre de la provincia", min_length=1)


class UbicacionOutput(BaseModel):
    lat: float
    lon: float
    comunidad: str
    zona_climatica_cte: Optional[str] = Field(
        None, description="Zona climática CTE (ej. D3)"
    )
    zona_climatica_origen: Optional[str] = Field(
        None, description="Origen del dato: capital_de_provincia"
    )
    zona_climatica_aproximada: Optional[bool] = Field(
        None, description="True si la zona se estima a partir de la capital"
    )


class IdoneidadFotovoltaica(BaseModel):
    disponible: bool
    produccion_especifica_kwh_kwp_year: Optional[float] = None
    radiacion_anual_kwh_m2: Optional[float] = None
    banda: Optional[str] = None


class IdoneidadClimatizacion(BaseModel):
    disponible: bool
    zona_climatica: Optional[str] = None
    banda: Optional[str] = None


class IdoneidadResult(BaseModel):
    fotovoltaica_autoconsumo: IdoneidadFotovoltaica
    climatizacion_aerotermia: IdoneidadClimatizacion


class IdoneidadOutput(BaseModel):
    ubicacion: UbicacionOutput
    idoneidad: IdoneidadResult
    aviso: str = Field(
        default="Índice orientativo basado en la ubicación. No es una estimación de ahorro ni sustituye a un estudio técnico.",
    )
