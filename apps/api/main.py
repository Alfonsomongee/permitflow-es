import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from seguridad import verificar_clave_interna
from routers.clasificador import router as clasificador_router
from routers.documentos import router as documentos_router
from routers.validador import router as validador_router
from routers.orientacion import router as orientacion_router
app = FastAPI(
    title="PermitFlow ES API",
    version="0.1.0",
    description="API para la clasificación y gestión de trámites de instalaciones en España."
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
    allow_headers=["Authorization", "Content-Type"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}

import secrets
from fastapi.responses import JSONResponse
from fastapi import Request

@app.middleware("http")
async def verificar_clave_global(request: Request, call_next):
    if request.url.path == "/health":
        return await call_next(request)

    clave = settings.INTERNAL_API_KEY
    if not clave:
        # Esto no debería ocurrir gracias al fail-closed en config.py, pero por si acaso.
        return JSONResponse(status_code=503, content={"detail": "INTERNAL_API_KEY no configurada"})

    x_internal_key = request.headers.get("X-Internal-Key")
    if not x_internal_key or not secrets.compare_digest(x_internal_key, clave):
        return JSONResponse(status_code=401, content={"detail": "Clave interna inválida"})

    return await call_next(request)

app.include_router(clasificador_router)
app.include_router(documentos_router)
app.include_router(validador_router)
app.include_router(orientacion_router)
