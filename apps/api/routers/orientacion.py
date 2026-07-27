"""Router de orientación — índice de idoneidad geográfica.

POST /api/v1/orientacion/idoneidad

Orquesta: Geocoding → Caché Postgres → PVGIS → Zonas CTE.
Rate-limit por organización vía tabla de caché.
"""

import json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.idoneidad_cache import IdoneidadCache
from schemas.orientacion import (
    IdoneidadClimatizacion,
    IdoneidadFotovoltaica,
    IdoneidadInput,
    IdoneidadOutput,
    IdoneidadResult,
    UbicacionOutput,
)
from servicios.geocoding_client import resolver_ubicacion
from servicios.pvgis_client import consultar_pvgis_mensual, consultar_pvgis_tmy

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/orientacion", tags=["orientacion"])

# ─── Constantes ────────────────────────────────────────────────────────────────

# Bandas cualitativas de producción específica FV (kWh/kWp/año).
# Rango español típico: ~1100 (norte montaña) a ~1900 (sureste costa).
# Estos cortes son orientativos y NO deben presentarse como cifras de ahorro.
BANDA_FV_EXCELENTE = 1600   # >= 1600 kWh/kWp/año
BANDA_FV_BUENA = 1400       # >= 1400
BANDA_FV_MODERADA = 1200    # >= 1200
# < 1200 → "baja"

CACHE_TTL_DAYS = 180

# Rate limit: máximo de consultas por organización por hora.
# Basado en la tabla de caché para no depender de Redis.
RATE_LIMIT_PER_ORG_PER_HOUR = 60

# ─── Zonas CTE ─────────────────────────────────────────────────────────────────

_ZONAS_CTE: Optional[dict] = None


def _cargar_zonas_cte() -> dict:
    """Carga y cachea en memoria el JSON de zonas climáticas CTE."""
    global _ZONAS_CTE
    if _ZONAS_CTE is None:
        ruta = Path(__file__).resolve().parent.parent / "data" / "zonas_climaticas_cte.json"
        with open(ruta, encoding="utf-8") as f:
            data = json.load(f)
        _ZONAS_CTE = data.get("zonas", {})
    return _ZONAS_CTE


def buscar_zona_climatica(provincia: str) -> Optional[str]:
    """
    Busca la zona climática CTE para una provincia (por nombre de capital).
    Intenta coincidencia exacta primero, luego búsqueda parcial.
    """
    zonas = _cargar_zonas_cte()

    # Normalizar la provincia de entrada para comparación
    provincia_lower = provincia.lower().strip()

    for capital, datos in zonas.items():
        # Coincidencia por nombre de capital
        if capital.lower() == provincia_lower:
            return datos["zona"]

    # Búsqueda parcial: la provincia podría ser un substring de la capital o viceversa
    for capital, datos in zonas.items():
        cap_lower = capital.lower()
        if provincia_lower in cap_lower or cap_lower in provincia_lower:
            return datos["zona"]

    return None


# ─── Helpers ───────────────────────────────────────────────────────────────────


def _banda_fotovoltaica(produccion: float) -> str:
    if produccion >= BANDA_FV_EXCELENTE:
        return "excelente"
    if produccion >= BANDA_FV_BUENA:
        return "buena"
    if produccion >= BANDA_FV_MODERADA:
        return "moderada"
    return "baja"


def _banda_climatizacion(zona: str) -> str:
    """
    Interpreta la severidad de invierno de la zona CTE (letra A-E)
    para estimar el potencial de ahorro en calefacción con aerotermia.
    """
    if not zona:
        return "sin datos"
    letra = zona[0].upper()
    if letra in ("D", "E"):
        return "ahorro alto en calefacción"
    if letra == "C":
        return "ahorro moderado en calefacción"
    if letra in ("A", "B"):
        return "ahorro bajo en calefacción (inviernos suaves)"
    # α (alfa) — Canarias
    return "ahorro muy bajo en calefacción (clima cálido)"


# Textos interpretativos por severidad de invierno (letra de zona CTE)
_DESCRIPCION_ZONA_CTE: dict[str, str] = {
    "A": "Clima muy cálido. Máximo rendimiento en refrigeración. Demanda de calefacción baja. COP estacional excelente (≈87% COP nominal para equipos centralizados).",
    "B": "Clima mediterráneo/atlántico moderado. Bomba de calor muy eficiente todo el año (≈80% COP nominal). Compatible con radiadores de baja temperatura.",
    "C": "Clima templado. Bomba de calor eficiente todo el año (≈80% COP nominal). Compatible con radiadores de baja temperatura.",
    "D": "Clima continental con inviernos fríos. Rendimiento bueno (≈75% COP nominal). Diseño crítico: suelo radiante o fan-coils recomendados.",
    "E": "Inviernos severos. La eficiencia se reduce significativamente (≈75% COP nominal). Imprescindible sistema de emisión a baja temperatura. Considerar apoyo eléctrico de respaldo.",
}


def _cache_key(lat: float, lon: float, angle: int = 30, aspect: int = 0) -> str:
    """Genera clave de caché redondeando lat/lon a 2 decimales (~1 km)."""
    return f"pvgis:{lat:.2f}:{lon:.2f}:{angle}:{aspect}"


# ─── Rate limiting ─────────────────────────────────────────────────────────────


async def _check_rate_limit(
    db: AsyncSession,
    org_id: str,
) -> None:
    """
    Comprueba el rate limit por organización usando la tabla idoneidad_cache.
    Cuenta las filas insertadas en la última hora cuya clave empieza con
    'ratelimit:{org_id}:'.
    """
    prefix = f"ratelimit:{org_id}:"
    una_hora = datetime.now(timezone.utc) - timedelta(hours=1)

    # Limpieza global de rate limits antiguos
    await db.execute(
        text("DELETE FROM idoneidad_cache WHERE clave LIKE 'ratelimit:%' AND calculado_en < now() - interval '2 hours'")
    )

    result = await db.execute(
        select(func.count()).where(
            IdoneidadCache.clave.like(f"{prefix}%"),
            IdoneidadCache.calculado_en >= una_hora,
        )
    )
    count = result.scalar_one()

    if count >= RATE_LIMIT_PER_ORG_PER_HOUR:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Límite de {RATE_LIMIT_PER_ORG_PER_HOUR} consultas por hora alcanzado. Inténtalo más tarde.",
        )


async def _register_rate_limit(
    db: AsyncSession,
    org_id: str,
    cache_key: str,
) -> None:
    """Registra una consulta para rate limiting."""
    rl_key = f"ratelimit:{org_id}:{cache_key}"
    entry = IdoneidadCache(
        clave=rl_key,
        payload={"type": "ratelimit"},
        calculado_en=datetime.now(timezone.utc),
    )
    await db.merge(entry)


# ─── Endpoint ──────────────────────────────────────────────────────────────────


@router.post("/idoneidad", response_model=IdoneidadOutput)
async def calcular_idoneidad(
    payload: IdoneidadInput,
    db: AsyncSession = Depends(get_db),
    x_org_id: Optional[str] = Header(default=None),
) -> IdoneidadOutput:
    """
    Calcula el índice de idoneidad geográfica para un municipio.

    Combina:
    - Google Geocoding → coordenadas + CCAA
    - PVGIS /PVcalc → producción fotovoltaica específica + producción mensual + SD_m
    - PVGIS /tmy → temperatura media mensual (T2m, ERA5) para aerotermia
    - CTE Anejo B → zona climática
    """
    # Rate limit (usa org_id del header de Clerk, o "anonymous" en desarrollo)
    org_id = x_org_id or "anonymous"
    await _check_rate_limit(db, org_id)

    # 1. Geocoding
    try:
        ubicacion = await resolver_ubicacion(payload.municipio, payload.provincia)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.exception("Error inesperado al geocodificar")
        raise HTTPException(status_code=500, detail=f"Error interno al calcular idoneidad: {exc}")

    lat = ubicacion["lat"]
    lon = ubicacion["lon"]
    comunidad = ubicacion["comunidad"]

    # 2. Zona climática CTE
    zona_cte = buscar_zona_climatica(payload.provincia)

    # 3. PVGIS PVcalc con campos mensuales (con caché Postgres + TTL)
    key = _cache_key(lat, lon)
    ttl_cutoff = datetime.now(timezone.utc) - timedelta(days=CACHE_TTL_DAYS)

    cached = await db.execute(
        select(IdoneidadCache).where(
            IdoneidadCache.clave == key,
            IdoneidadCache.calculado_en > ttl_cutoff,
        )
    )
    cache_hit = cached.scalar_one_or_none()

    if cache_hit is not None:
        pvgis_data = cache_hit.payload
    else:
        pvgis_data_raw = await consultar_pvgis_mensual(lat, lon)
        if pvgis_data_raw is not None:
            pvgis_data = pvgis_data_raw
            entry = IdoneidadCache(
                clave=key,
                payload=pvgis_data,
                calculado_en=datetime.now(timezone.utc),
            )
            await db.merge(entry)
        else:
            pvgis_data = None

    # 4. PVGIS TMY → temperatura mensual para aerotermia (caché propia)
    tmy_key = f"tmy:{lat:.2f}:{lon:.2f}"
    cached_tmy = await db.execute(
        select(IdoneidadCache).where(
            IdoneidadCache.clave == tmy_key,
            IdoneidadCache.calculado_en > ttl_cutoff,
        )
    )
    cache_tmy_hit = cached_tmy.scalar_one_or_none()

    if cache_tmy_hit is not None:
        temp_mensual = cache_tmy_hit.payload.get("temperatura_media_mensual")
    else:
        temp_mensual = await consultar_pvgis_tmy(lat, lon)
        if temp_mensual is not None:
            entry_tmy = IdoneidadCache(
                clave=tmy_key,
                payload={"temperatura_media_mensual": temp_mensual},
                calculado_en=datetime.now(timezone.utc),
            )
            await db.merge(entry_tmy)

    # Registrar consulta para rate limiting
    await _register_rate_limit(db, org_id, key)
    await db.commit()

    # 5. Construir respuesta
    # Fotovoltaica
    if pvgis_data is not None:
        produccion = pvgis_data.get("produccion_especifica_kwh_kwp_year")
        radiacion = pvgis_data.get("radiacion_anual_kwh_m2")
        fv = IdoneidadFotovoltaica(
            disponible=True,
            produccion_especifica_kwh_kwp_year=produccion,
            radiacion_anual_kwh_m2=radiacion,
            banda=_banda_fotovoltaica(produccion) if produccion else None,
            produccion_mensual_kwh=pvgis_data.get("produccion_mensual_kwh"),
            desviacion_estandar_mensual=pvgis_data.get("desviacion_estandar_mensual"),
        )
    else:
        fv = IdoneidadFotovoltaica(disponible=False)

    # Climatización
    descripcion_zona = None
    if zona_cte:
        letra = zona_cte[0].upper()
        descripcion_zona = _DESCRIPCION_ZONA_CTE.get(letra)

    clim = IdoneidadClimatizacion(
        disponible=zona_cte is not None,
        zona_climatica=zona_cte,
        banda=_banda_climatizacion(zona_cte) if zona_cte else None,
        descripcion_zona=descripcion_zona,
        temperatura_media_mensual=temp_mensual,
    )

    ubicacion_out = UbicacionOutput(
        lat=lat,
        lon=lon,
        comunidad=comunidad,
        zona_climatica_cte=zona_cte,
        zona_climatica_origen="capital_de_provincia" if zona_cte else None,
        zona_climatica_aproximada=True if zona_cte else None,
    )

    return IdoneidadOutput(
        ubicacion=ubicacion_out,
        idoneidad=IdoneidadResult(
            fotovoltaica_autoconsumo=fv,
            climatizacion_aerotermia=clim,
        ),
    )
