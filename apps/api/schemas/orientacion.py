"""Schemas Pydantic para el endpoint de idoneidad geográfica."""

from pydantic import BaseModel, Field
from typing import Literal, Optional


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
    # Campos mensuales — generica_pendiente_url hasta verificar con curl real
    produccion_mensual_kwh: Optional[list[float]] = Field(
        None, description="Producción media mensual (12 valores, kWh/mes) — campo E_m de PVGIS"
    )
    desviacion_estandar_mensual: Optional[list[float]] = Field(
        None, description="Desviación estándar interanual mensual (12 valores) — campo SD_m de PVGIS"
    )


class IdoneidadClimatizacion(BaseModel):
    disponible: bool
    zona_climatica: Optional[str] = None
    banda: Optional[str] = None
    descripcion_zona: Optional[str] = Field(
        None, description="Texto interpretativo de la zona climática CTE para aerotermia"
    )
    temperatura_media_mensual: Optional[list[float]] = Field(
        None, description="Temperatura media mensual °C (12 valores, T2m ERA5) — generica_pendiente_url"
    )
    # Topología del equipo para cálculo de factor de ponderación SCOP
    topologia_equipo: Optional[Literal["centralizado", "split"]] = Field(
        None, description="Tipo de equipo (centralizado o split) — afecta al FP de la Tabla 4.1 IDAE"
    )


class IdoneidadResult(BaseModel):
    fotovoltaica_autoconsumo: IdoneidadFotovoltaica
    climatizacion_aerotermia: IdoneidadClimatizacion


class IdoneidadOutput(BaseModel):
    ubicacion: UbicacionOutput
    idoneidad: IdoneidadResult
    aviso: str = Field(
        default="Índice orientativo basado en la ubicación. No es una estimación de ahorro ni sustituye a un estudio técnico.",
    )
