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


async def consultar_pvgis_mensual(
    lat: float,
    lon: float,
    angle: int = 30,
    aspect: int = 0,
) -> Optional[dict]:
    """
    Extiende consultar_pvgis extrayendo producción mensual y desviación estándar.

    NOTA: Los nombres de campo E_m, H(i)_m y SD_m son generica_pendiente_url
    (pendientes de verificar con curl real contra la API antes de merge a main).

    Retorna:
        {
            "produccion_especifica_kwh_kwp_year": float,
            "radiacion_anual_kwh_m2": float,
            "produccion_mensual_kwh": list[float],   # 12 valores E_m
            "desviacion_estandar_mensual": list[float],  # 12 valores SD_m
        }
        o None si PVGIS no responde.
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

        outputs = data.get("outputs", {})
        totals = outputs.get("totals", {}).get("fixed", {})
        monthly = outputs.get("monthly", {}).get("fixed", [])

        e_y = totals.get("E_y")
        h_i_y = totals.get("H(i)_y")

        if e_y is None:
            logger.warning("PVGIS (mensual) sin E_y para lat=%s lon=%s", lat, lon)
            return None

        produccion_mensual = [round(m.get("E_m", 0), 1) for m in monthly]
        desviacion_mensual = [round(m.get("SD_m", 0), 1) for m in monthly]

        return {
            "produccion_especifica_kwh_kwp_year": round(e_y, 1),
            "radiacion_anual_kwh_m2": round(h_i_y, 1) if h_i_y is not None else None,
            "produccion_mensual_kwh": produccion_mensual,
            "desviacion_estandar_mensual": desviacion_mensual,
        }

    except httpx.TimeoutException:
        logger.warning("PVGIS (mensual) timeout para lat=%s lon=%s", lat, lon)
        return None
    except httpx.HTTPStatusError as exc:
        logger.warning("PVGIS (mensual) HTTP %s para lat=%s lon=%s", exc.response.status_code, lat, lon)
        return None
    except Exception:
        logger.exception("Error inesperado consultando PVGIS mensual para lat=%s lon=%s", lat, lon)
        return None


PVGIS_TMY_URL = "https://re.jrc.ec.europa.eu/api/v5_3/tmy"


async def consultar_pvgis_tmy(
    lat: float,
    lon: float,
) -> Optional[list[float]]:
    """
    Consulta el endpoint /tmy de PVGIS y calcula la temperatura media mensual
    (T2m — bulbo seco a 2m, dataset ERA5/ERA5-Land).

    NOTA: nombre de campo T2m es generica_pendiente_url.
    Verificar con curl real antes de merge a main.

    Retorna lista de 12 floats (temperatura media °C por mes, enero–diciembre)
    o None si PVGIS no responde.
    """
    params = {
        "lat": lat,
        "lon": lon,
        "outputformat": "json",
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(PVGIS_TMY_URL, params=params)
            response.raise_for_status()
            data = response.json()

        # /tmy devuelve outputs.tmy_hourly con registros horarios
        # Cada registro tiene "time(UTC)" (formato "YYYYMMDDHHMM") y "T2m" en °C
        hourly = data.get("outputs", {}).get("tmy_hourly", [])
        if not hourly:
            return None

        # Acumular T2m por mes (extraer mes del campo time)
        from collections import defaultdict
        sumas: dict[int, float] = defaultdict(float)
        conteos: dict[int, int] = defaultdict(int)

        for registro in hourly:
            tiempo_str = str(registro.get("time(UTC)", ""))
            if len(tiempo_str) >= 6:
                mes = int(tiempo_str[4:6])  # Formato YYYYMMDDHHMM → mes en posición 4:6
                t2m = registro.get("T2m")
                if t2m is not None:
                    sumas[mes] += float(t2m)
                    conteos[mes] += 1

        if len(sumas) < 12:
            logger.warning("PVGIS TMY incompleto: solo %d meses para lat=%s lon=%s", len(sumas), lat, lon)
            return None

        return [round(sumas[m] / conteos[m], 1) for m in range(1, 13)]

    except httpx.TimeoutException:
        logger.warning("PVGIS TMY timeout para lat=%s lon=%s", lat, lon)
        return None
    except httpx.HTTPStatusError as exc:
        logger.warning("PVGIS TMY HTTP %s para lat=%s lon=%s", exc.response.status_code, lat, lon)
        return None
    except Exception:
        logger.exception("Error inesperado consultando PVGIS TMY para lat=%s lon=%s", lat, lon)
        return None
