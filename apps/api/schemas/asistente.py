from pydantic import BaseModel, Field
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

class AsistenteReporteRequest(BaseModel):
    mensaje_id: uuid.UUID
    contenido: str = Field(..., min_length=1)
