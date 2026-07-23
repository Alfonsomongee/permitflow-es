import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from seguridad import verificar_clave_interna
from routers.clasificador import router as clasificador_router
from routers.documentos import router as documentos_router
from routers.validador import router as validador_router
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

app.include_router(clasificador_router, dependencies=[Depends(verificar_clave_interna)])
app.include_router(documentos_router, dependencies=[Depends(verificar_clave_interna)])
app.include_router(validador_router, dependencies=[Depends(verificar_clave_interna)])
