from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Dict, List, Literal, Optional
import uuid

class AsistenteMensajeRequest(BaseModel):
    role: Literal["user", "assistant"] = Field(..., description="El rol del mensaje (user o assistant)")
    # Tope en el propio esquema: antes se truncaba a 2000 DESPUÉS de parsear
    # hasta 50 mensajes de tamaño arbitrario.
    content: str = Field(..., max_length=4000, description="El contenido del mensaje")

class AsistenteChatRequest(BaseModel):
    mensajes: List[AsistenteMensajeRequest] = Field(..., max_length=50)
    expediente_id: Optional[uuid.UUID] = None
    comunidad: Optional[str] = Field(default=None, max_length=60, pattern=r"^[a-z0-9_]+$")
    tecnologia: Optional[str] = Field(default=None, max_length=60, pattern=r"^[a-z0-9_]+$")
    params: Optional[Dict] = Field(default=None, max_length=40)
    # Si se envía, la respuesta se añade a esta conversación existente
    # (debe pertenecer a la misma organización). Si se omite, se crea una
    # conversación nueva -- ver historial de chat, mejoras 2026-08-07.
    conversacion_id: Optional[uuid.UUID] = None

class AsistenteReporteRequest(BaseModel):
    mensaje_id: uuid.UUID
    contenido: str = Field(..., min_length=1, max_length=2000)

class AsistenteMensajeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    rol: str
    contenido: str
    creado_en: datetime

class AsistenteConversacionOut(BaseModel):
    id: uuid.UUID
    expediente_id: Optional[uuid.UUID]
    mensajes: List[AsistenteMensajeOut]
