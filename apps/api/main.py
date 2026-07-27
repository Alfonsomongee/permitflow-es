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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan de la aplicación."""
    # Al arrancar: marcar como error los estudios que quedaron en pendiente
    # tras un restart o deploy anterior.
    await _barrer_estudios_expirados()
    yield
    # Al apagar: nada que limpiar por ahora.


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
# Requiere --proxy-headers en uvicorn (activo por defecto en Railway y Vercel).
# AVISO: sin esta configuración, el rate limit agrupa a todos los usuarios
# bajo la IP del balanceador. Verificar la IP logueada en las primeras peticiones.
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

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
