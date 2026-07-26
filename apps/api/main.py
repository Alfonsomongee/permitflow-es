import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from seguridad import verificar_clave_interna
from routers.clasificador import router as clasificador_router
from routers.documentos import router as documentos_router
from routers.validador import router as validador_router
from routers.orientacion import router as orientacion_router
from routers.asistente import router as asistente_router

app = FastAPI(
    title="PermitFlow ES API",
    version="0.1.0",
    description="API para la clasificación y gestión de trámites de instalaciones en España.",
    dependencies=[Depends(verificar_clave_interna)]
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
    allow_headers=["Authorization", "Content-Type", "X-Internal-Key"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}

app.include_router(clasificador_router)
app.include_router(documentos_router)
app.include_router(validador_router)
app.include_router(orientacion_router)
app.include_router(asistente_router)
