import os
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from config import settings
from seguridad import verificar_clave_interna
from routers.clasificador import router as clasificador_router
from routers.documentos import router as documentos_router
from routers.validador import router as validador_router
from routers.orientacion import router as orientacion_router
from routers.asistente import router as asistente_router
from routers.simulador import router as simulador_router
from fastapi.responses import JSONResponse
import traceback

logger = logging.getLogger(__name__)

async def _barrer_estudios_expirados():
    """Marca como 'error' los estudios en 'pendiente' con más de 10 minutos.
    
    Idempotente: si hay varias réplicas, el UPDATE es seguro.
    Se ejecuta al arrancar la app. Para producción con múltiples workers,
    considerar un job externo (ARQ, cron de Railway) en vez del lifespan.
    """
    from database import AsyncSessionLocal
    from models.simulacion import EstudioEnergetico
    from sqlalchemy import update
    
    umbral = datetime.now(timezone.utc) - timedelta(minutes=10)
    async with AsyncSessionLocal() as db:
        try:
            await db.execute(
                update(EstudioEnergetico)
                .where(
                    EstudioEnergetico.estado == "pendiente",
                    EstudioEnergetico.creado_en < umbral,
                )
                .values(estado="error")
            )
            await db.commit()
        except Exception as e:
            logger.error(f"Error en barrido de estudios expirados: {e}")


async def _barrido_periodico():
    """Barre estudios expirados cada 5 minutos mientras el proceso vive.
    
    Limitaciones conocidas (documentadas en ADR-005):
    - In-process: un deploy a mitad de ejecución pierde la tarea.
    - Múltiples réplicas: el UPDATE es idempotente, sin problema de doble ejecución.
    - Deuda técnica: migrar a ARQ + job externo cuando se active el segundo worker.
    """
    while True:
        await _barrer_estudios_expirados()
        await asyncio.sleep(300)  # 5 minutos


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan de la aplicación."""
    tarea = asyncio.create_task(_barrido_periodico())
    yield
    tarea.cancel()
    try:
        await tarea
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="PermitFlow ES API",
    version="0.1.0",
    description="API para la clasificación y gestión de trámites de instalaciones en España.",
    dependencies=[Depends(verificar_clave_interna)],
    lifespan=lifespan,
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Excepción global no manejada: {exc}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor. Por favor, contacta con soporte."},
    )

# ProxyHeadersMiddleware: hace que request.client.host sea la IP real del cliente.
#
# AVISO DE SEGURIDAD: trusted_hosts="*" permite que cualquier cliente falsifique
# X-Forwarded-For y evada el rate limit. Configurar TRUSTED_PROXIES en el entorno.
#
# Railway: añadir la IP del balanceador interno. Si no hay rango estable documentado,
# dejar TRUSTED_PROXIES vacío: el rate limit operará sobre la IP del balanceador
# (todos los usuarios comparten cuota) pero NO será falsificable.
#
# Vercel: ver https://vercel.com/docs/edge-network/headers#x-forwarded-for
_trusted = os.getenv("TRUSTED_PROXIES", "").strip()
app.add_middleware(
    ProxyHeadersMiddleware,
    trusted_hosts=_trusted if _trusted else "127.0.0.1",
)

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    # X-Estudio-Token: cabecera para el token de polling del simulador
    allow_headers=["Authorization", "Content-Type", "X-Internal-Key", "X-Estudio-Token"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}

app.include_router(clasificador_router)
app.include_router(documentos_router)
app.include_router(validador_router)
app.include_router(orientacion_router)
app.include_router(asistente_router)
app.include_router(simulador_router)
