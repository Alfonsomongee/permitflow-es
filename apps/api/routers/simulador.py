from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel
from typing import Optional
from redis.asyncio import Redis
import uuid
import json
import hmac
import hashlib
import time

from config import settings
from database import get_db, AsyncSessionLocal
from models.simulacion import AnalisisFactura, EstudioEnergetico
from servicios.facturas_parser import parsear_factura
from servicios.informes_ia import generar_informe_simulacion

router = APIRouter(prefix="/simulador", tags=["Simulador"])

# ---------------------------------------------------------------------------
# Redis — instanciar por petición (mejorar a lifespan en el siguiente sprint)
# ---------------------------------------------------------------------------

async def get_redis():
    redis_url = settings.REDIS_URL or "redis://localhost:6379"
    redis = Redis.from_url(redis_url, decode_responses=True)
    try:
        yield redis
    finally:
        await redis.close()


# ---------------------------------------------------------------------------
# Rate limiting atómico
# ---------------------------------------------------------------------------

async def _rate_limit(redis: Redis, ip: str, key_prefix: str, max_req: int, ttl: int = 3600):
    """Rate limit atómico con INCR + EXPIRE.
    
    El INCR crea la clave si no existe (valor inicial 1).
    Si count==1, establecemos TTL (primera petición en la ventana).
    Si count > max_req, rechazamos.
    
    Sin race condition: INCR es atómico en Redis.
    Sin clave sin TTL: el expire se aplica SIEMPRE en la primera petición.
    """
    key = f"rate:{key_prefix}:{ip}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, ttl)
    if count > max_req:
        raise HTTPException(
            status_code=429,
            detail=f"Has superado el límite de {max_req} peticiones por hora. Inténtalo más tarde."
        )


def _get_real_ip(request: Request) -> str:
    """Obtener la IP real del cliente.
    
    NOTA: ProxyHeadersMiddleware de uvicorn debe estar configurado con
    --proxy-headers y --forwarded-allow-ips en Railway/Vercel.
    Con ese middleware activo, request.client.host ya contiene la IP real.
    Sin él, request.client.host es la IP del balanceador (todos comparten cuota).
    
    Verificar tras el deploy que la IP logueada en las primeras peticiones
    es la del cliente real, no 10.x.x.x o 172.x.x.x.
    """
    return request.client.host if request.client else "unknown"


# ---------------------------------------------------------------------------
# HMAC para tokens de estudio
# ---------------------------------------------------------------------------

TOKEN_TTL = 900  # 15 minutos — cubre el polling con margen

def _crear_token_estudio(estudio_id: str) -> str:
    """Crea un token firmado HMAC-SHA256 con TTL. Va en cabecera, no en URL."""
    ts = int(time.time())
    mensaje = f"{estudio_id}:{ts}".encode()
    firma = hmac.new(settings.SECRET_KEY.encode(), mensaje, hashlib.sha256).hexdigest()
    return f"{ts}:{firma}"


def _verificar_token_estudio(estudio_id: str, token: str) -> bool:
    """Verifica firma y TTL del token. Usa compare_digest para evitar timing attacks."""
    try:
        ts_str, firma_recibida = token.split(":", 1)
        ts = int(ts_str)
    except (ValueError, AttributeError):
        return False

    if int(time.time()) - ts > TOKEN_TTL:
        return False

    mensaje = f"{estudio_id}:{ts}".encode()
    firma_esperada = hmac.new(settings.SECRET_KEY.encode(), mensaje, hashlib.sha256).hexdigest()
    return hmac.compare_digest(firma_esperada, firma_recibida)


def _hash_cups(cups: str) -> str:
    """HMAC-SHA256 del CUPS. Sin la clave del servidor, la fuerza bruta es inviable."""
    return hmac.new(settings.SECRET_KEY.encode(), cups.encode(), hashlib.sha256).hexdigest()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/factura", response_model=dict)
async def subir_factura(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis)
):
    """Sube una factura eléctrica en PDF y extrae los datos clave.
    
    Rate limit: 10 peticiones/hora por IP.
    Seguridad: magic bytes + límite de tamaño aplicados en facturas_parser.
    RGPD: el CUPS no se persiste en claro, solo su HMAC.
    """
    ip = _get_real_ip(request)
    await _rate_limit(redis, ip, "factura", max_req=10)

    # Rechazo educativo de imágenes (la rama educativa es producto, no un bug)
    if file.content_type in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(
            status_code=400,
            detail=(
                "Las fotos de facturas suelen tener mala calidad y causan errores en la extracción. "
                "Por favor, descarga el PDF original desde el área de cliente de tu distribuidora: "
                "Iberdrola (https://www.iberdrola.es/mi-area-cliente), "
                "Endesa (https://www.endesa.com/es/area-privada), "
                "o Naturgy (https://areaprivada.naturgy.es)."
            )
        )

    resultado = await parsear_factura(file)

    # Sanear datos_raw: eliminar CUPS en claro antes de persistir
    datos_raw_saneados = {
        k: v for k, v in resultado.items()
        if k not in ("cups",)
    }

    cups_hash = _hash_cups(resultado["cups"]) if resultado.get("cups") else None

    analisis = AnalisisFactura(
        cups_hash=cups_hash,
        consumo_anual_kwh=resultado.get("consumo_anual_kwh"),
        potencia_contratada_kw=resultado.get("potencia_contratada_kw"),
        estado_extraccion=resultado.get("estado"),
        extraccion_fuente=resultado.get("extraccion_fuente"),
        fuente_dato=resultado.get("fuente_dato"),
        datos_raw=datos_raw_saneados,
    )
    db.add(analisis)
    await db.commit()
    await db.refresh(analisis)

    return {
        "id": str(analisis.id),
        "estado": analisis.estado_extraccion,
        # El CUPS solo va al cliente en la respuesta (no se persiste en BD en claro)
        "cups_masked": f"{resultado['cups'][:6]}...{resultado['cups'][-4:]}" if resultado.get("cups") else None,
        "consumo_anual_kwh": analisis.consumo_anual_kwh,
        "potencia_contratada_kw": analisis.potencia_contratada_kw,
        "fuente_dato": analisis.fuente_dato,
        "extraccion_fuente": analisis.extraccion_fuente,
        "error": resultado.get("error")
    }


class GenerarRequest(BaseModel):
    analisis_id: str
    region: Optional[str] = None
    tipo_inmueble: Optional[str] = None  # Necesario para validar alcance


async def _generar_estudio_background(estudio_id: str, datos_factura: dict, region: Optional[str]):
    """BackgroundTask que llama al LLM y actualiza el estado del estudio.
    
    Crea su propia sesión de BD (no reutiliza la del request, que ya está cerrada).
    AVISO: BackgroundTasks es in-process. Un deploy durante la ejecución pierde la tarea.
    El barrido de expiración (ver main.py lifespan) marca como 'error' los estudios
    en 'pendiente' con más de 10 minutos.
    """
    async with AsyncSessionLocal() as db:
        try:
            informe = await generar_informe_simulacion(datos_factura, region)
            await db.execute(
                update(EstudioEnergetico)
                .where(EstudioEnergetico.id == uuid.UUID(estudio_id))
                .values(estado="completado", resultado_json=informe.model_dump())
            )
            await db.commit()
        except Exception as e:
            # En producción: enviar a Sentry. No loguear datos de la factura.
            print(f"Error generando estudio {estudio_id}: {type(e).__name__}")
            try:
                await db.execute(
                    update(EstudioEnergetico)
                    .where(EstudioEnergetico.id == uuid.UUID(estudio_id))
                    .values(estado="error")
                )
                await db.commit()
            except Exception:
                pass


@router.post("/generar", response_model=dict)
async def generar_simulacion(
    request: Request,
    body: GenerarRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis)
):
    """Encola la generación del informe IA para un análisis de factura previo.
    
    Rate limit: 5 peticiones/hora por IP.
    Devuelve el estudio_id y un token de corta duración para el polling.
    El token va en cabecera X-Estudio-Token, no en la URL.
    """
    ip = _get_real_ip(request)
    await _rate_limit(redis, ip, "generar", max_req=5)

    # Validar alcance: solo residencial en esta versión
    if body.tipo_inmueble in ("empresa", "comunidad_vecinos"):
        raise HTTPException(
            status_code=422,
            detail=(
                "El simulador está optimizado para viviendas residenciales. "
                "Para empresas y comunidades de vecinos, contáctanos directamente."
            )
        )

    try:
        analisis_uuid = uuid.UUID(body.analisis_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de análisis inválido.")

    result = await db.execute(select(AnalisisFactura).where(AnalisisFactura.id == analisis_uuid))
    analisis = result.scalar_one_or_none()

    if not analisis:
        raise HTTPException(status_code=404, detail="Análisis de factura no encontrado.")

    if analisis.estado_extraccion != "exitoso":
        raise HTTPException(status_code=400, detail="No se pueden usar datos no extraídos/no validados.")

    # Crear el estudio en estado pendiente ANTES de lanzar la tarea
    estudio = EstudioEnergetico(
        analisis_factura_id=analisis_uuid,
        estado="pendiente",
    )
    db.add(estudio)
    await db.commit()
    await db.refresh(estudio)
    estudio_id = str(estudio.id)

    datos = {
        "consumo_anual_kwh": analisis.consumo_anual_kwh,
        "potencia_contratada_kw": analisis.potencia_contratada_kw,
        "fuente_dato": analisis.fuente_dato,
    }

    background_tasks.add_task(_generar_estudio_background, estudio_id, datos, body.region)

    token = _crear_token_estudio(estudio_id)
    return {
        "estudio_id": estudio_id,
        "estado": "pendiente",
        # El token va aquí para que el cliente lo guarde y lo envíe en cabecera
        "token": token,
    }


class EstudioResponse(BaseModel):
    estudio_id: str
    estado: str  # pendiente | completado | error
    resultado: Optional[dict] = None


@router.get("/estudio/{estudio_id}", response_model=EstudioResponse)
async def obtener_estudio(
    estudio_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Consulta el estado de un estudio energético.
    
    Requiere el token firmado en la cabecera X-Estudio-Token.
    TTL del token: 15 minutos (cubre el ciclo de polling con margen).
    Si necesitas un enlace compartible del informe, eso es una feature separada.
    """
    token = request.headers.get("X-Estudio-Token", "")
    if not _verificar_token_estudio(str(estudio_id), token):
        raise HTTPException(status_code=401, detail="Token inválido o expirado.")

    result = await db.execute(select(EstudioEnergetico).where(EstudioEnergetico.id == estudio_id))
    estudio = result.scalar_one_or_none()

    if not estudio:
        raise HTTPException(status_code=404, detail="Estudio no encontrado.")

    return EstudioResponse(
        estudio_id=str(estudio.id),
        estado=estudio.estado,
        resultado=estudio.resultado_json if estudio.estado == "completado" else None,
    )
