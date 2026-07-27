from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from redis.asyncio import Redis
import uuid
import json

from config import settings
from database import get_db, AsyncSessionLocal
from models.simulacion import AnalisisFactura, EstudioEnergetico
from servicios.facturas_parser import parsear_factura
from servicios.informes_ia import generar_informe_simulacion

router = APIRouter(prefix="/simulador", tags=["Simulador"])

async def get_redis():
    redis_url = settings.REDIS_URL or "redis://localhost:6379"
    redis = Redis.from_url(redis_url, decode_responses=True)
    try:
        yield redis
    finally:
        await redis.close()

@router.post("/factura")
async def subir_factura(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    if file.content_type in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(
            status_code=400,
            detail=(
                "Las fotos de facturas suelen tener mala calidad y causar errores en la extracción. "
                "Por favor, descarga el PDF original desde el área de cliente de tu distribuidora o comercializadora: "
                "Iberdrola (https://www.iberdrola.es/mi-area-cliente), "
                "Endesa (https://www.endesa.com/es/area-privada), "
                "o Naturgy (https://areaprivada.naturgy.es)."
            )
        )
        
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="El archivo debe ser un PDF.")
        
    resultado = await parsear_factura(file)
    
    analisis = AnalisisFactura(
        cups=resultado.get("cups"),
        consumo_anual_kwh=resultado.get("consumo_anual_kwh"),
        potencia_contratada_kw=resultado.get("potencia_contratada_kw"),
        estado_extraccion=resultado.get("estado"),
        datos_raw=resultado
    )
    db.add(analisis)
    await db.commit()
    await db.refresh(analisis)
    
    return {
        "id": analisis.id,
        "estado": analisis.estado_extraccion,
        "cups": analisis.cups,
        "consumo_anual_kwh": analisis.consumo_anual_kwh,
        "potencia_contratada_kw": analisis.potencia_contratada_kw,
        "error": resultado.get("error")
    }

class GenerarRequest(BaseModel):
    analisis_id: str
    region: Optional[str] = None

async def generar_estudio_background(analisis_id: str, datos_factura: dict, region: Optional[str], ip_origen: str):
    try:
        informe = await generar_informe_simulacion(datos_factura, region)
        
        async with AsyncSessionLocal() as db:
            estudio = EstudioEnergetico(
                analisis_factura_id=uuid.UUID(analisis_id),
                ip_origen=ip_origen,
                resultado_json=informe.model_dump()
            )
            db.add(estudio)
            await db.commit()
    except Exception as e:
        # En producción se enviaría a Sentry o similar
        print(f"Error generando estudio en background: {e}")

@router.post("/generar")
async def generar_simulacion(
    request: Request,
    body: GenerarRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis)
):
    ip_origen = request.client.host if request.client else "unknown"
    
    # Rate limit: 5 por hora
    rate_limit_key = f"rate_limit:simulador:{ip_origen}"
    requests_count = await redis.get(rate_limit_key)
    
    if requests_count and int(requests_count) >= 5:
        raise HTTPException(status_code=429, detail="Has superado el límite de 5 simulaciones por hora.")
        
    pipe = redis.pipeline()
    pipe.incr(rate_limit_key)
    if not requests_count:
        pipe.expire(rate_limit_key, 3600)
    await pipe.execute()
    
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
        
    datos = {
        "cups": analisis.cups,
        "consumo_anual_kwh": analisis.consumo_anual_kwh,
        "potencia_contratada_kw": analisis.potencia_contratada_kw
    }
    
    background_tasks.add_task(generar_estudio_background, body.analisis_id, datos, body.region, ip_origen)
    
    return {"mensaje": "Simulación en proceso", "analisis_id": body.analisis_id}
