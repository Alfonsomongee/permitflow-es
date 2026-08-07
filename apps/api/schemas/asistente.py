from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Dict
import uuid

class AsistenteMensajeRequest(BaseModel):
    role: str = Field(..., description="El rol del mensaje (user o assistant)")
    content: str = Field(..., description="El contenido del mensaje")

class AsistenteChatRequest(BaseModel):
    mensajes: List[AsistenteMensajeRequest] = Field(..., max_length=50)
    expediente_id: Optional[uuid.UUID] = None
    comunidad: Optional[str] = None
    tecnologia: Optional[str] = None
    params: Optional[Dict] = None
    # Si se envía, la respuesta se añade a esta conversación existente
    # (debe pertenecer a la misma organización). Si se omite, se crea una
    # conversación nueva -- ver historial de chat, mejoras 2026-08-07.
    conversacion_id: Optional[uuid.UUID] = None

class AsistenteReporteRequest(BaseModel):
    mensaje_id: uuid.UUID
    contenido: str = Field(..., min_length=1)

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
