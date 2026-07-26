"""Cliente PVGIS (Photovoltaic Geographical Information System).

Consulta la API v5.3 del JRC para obtener la producción específica
(kWh/kWp/año) de una instalación fotovoltaica tipo en unas coordenadas dadas.

El peakpower=1 es deliberado: normaliza la producción a 1 kWp,
convirtiendo el resultado en un índice comparable entre ubicaciones
e independiente del tamaño real de la instalación.

Documentación: https://re.jrc.ec.europa.eu/pvg_tools/en/
"""

import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

PVGIS_URL = "https://re.jrc.ec.europa.eu/api/v5_3/PVcalc"
PVGIS_TIMEOUT = 15  # segundos


async def consultar_pvgis(
    lat: float,
    lon: float,
    angle: int = 30,
    aspect: int = 0,
) -> Optional[dict]:
    """
    Consulta PVGIS y devuelve producción específica y radiación anual.

    Retorna:
        {
            "produccion_especifica_kwh_kwp_year": float,
            "radiacion_anual_kwh_m2": float,
        }
        o None si PVGIS no responde o devuelve error.
    """
    params = {
        "lat": lat,
        "lon": lon,
        "peakpower": 1,
        "loss": 14,
        "angle": angle,
        "aspect": aspect,
        "pvtechchoice": "crystSi",
        "mountingplace": "free",
        "outputformat": "json",
    }

    try:
        async with httpx.AsyncClient(timeout=PVGIS_TIMEOUT) as client:
            response = await client.get(PVGIS_URL, params=params)
            response.raise_for_status()
            data = response.json()

        totals = data.get("outputs", {}).get("totals", {}).get("fixed", {})
        e_y = totals.get("E_y")
        h_i_y = totals.get("H(i)_y")

        if e_y is None:
            logger.warning("PVGIS respondió pero sin E_y para lat=%s lon=%s", lat, lon)
            return None

        return {
            "produccion_especifica_kwh_kwp_year": round(e_y, 1),
            "radiacion_anual_kwh_m2": round(h_i_y, 1) if h_i_y is not None else None,
        }

    except httpx.TimeoutException:
        logger.warning("PVGIS timeout para lat=%s lon=%s", lat, lon)
        return None
    except httpx.HTTPStatusError as exc:
        logger.warning("PVGIS HTTP %s para lat=%s lon=%s", exc.response.status_code, lat, lon)
        return None
    except Exception:
        logger.exception("Error inesperado consultando PVGIS para lat=%s lon=%s", lat, lon)
        return None
