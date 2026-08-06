import json
import uuid
import logging
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models.expediente import Expediente
from models.organizacion import Organizacion
from schemas.asistente import AsistenteChatRequest
from servicios.ai_client import completar_stream
from servicios.asistente_context import construir_contexto
from servicios.asistente_presupuesto import verificar_presupuesto, registrar_uso
# from models.asistente import AsistenteConversacion, AsistenteMensaje (para guardar historial, si se quiere, por ahora lo simplificaremos)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/asistente", tags=["asistente"])

@router.post("/chat")
async def chat_asistente(
    request: AsistenteChatRequest,
    x_org_id: str = Header(..., description="ID de la organización en Clerk"),
    session: AsyncSession = Depends(get_db)
):
    # 0. Obtener la organización interna
    stmt_org = select(Organizacion).where(Organizacion.clerk_org_id == x_org_id)
    res_org = await session.execute(stmt_org)
    organizacion = res_org.scalars().first()
    if not organizacion:
        raise HTTPException(status_code=403, detail="Organización no encontrada o sin acceso")
    internal_org_id = organizacion.id

    # 1. Verificar presupuesto usando el ID interno
    await verificar_presupuesto(internal_org_id, session)

    # 2. Cargar expediente si aplica
    expediente = None
    if request.expediente_id:
        stmt = select(Expediente).where(
            Expediente.id == request.expediente_id,
            Expediente.org_id == internal_org_id
        )
        res = await session.execute(stmt)
        expediente = res.scalars().first()
        if not expediente:
            raise HTTPException(status_code=404, detail="Expediente no encontrado")

    # 3. Construir contexto
    # Reutilizamos los params o inferimos de comunidad/tecnologia
    params = request.params or {}
    if request.comunidad:
        params["comunidad"] = request.comunidad
    if request.tecnologia:
        params["tipo_instalacion"] = request.tecnologia

    system_prompt = construir_contexto(expediente=expediente, params=params)

    # 4. Formatear mensajes
    mensajes_llm = []
    for msg in request.mensajes:
        if msg.role not in ("user", "assistant"):
            continue
        mensajes_llm.append({
            "role": msg.role,
            "content": msg.content[:2000] # Sanitizar/Truncar un poco si es user hostil
        })

    # 5. Configurar el stream SSE y registrar uso al final
    async def sse_generator() -> AsyncGenerator[str, None]:
        usage_stats = {}
        
        try:
            async for chunk in completar_stream(
                mensajes=mensajes_llm,
                system=system_prompt,
                max_tokens=1000,
                temperatura=0.1,
                usage_stats=usage_stats
            ):
                # El formato SSE estándar esperado por Vercel AI SDK es data: {chunk}\n\n
                # o enviamos directamente texto si el cliente maneja un stream raw.
                # Como el ChatWidget suele usar useChat, el formato depende.
                # Si el frontend usa ai SDK sin adaptadores complejos, lo más seguro es:
                # 0: "texto" para chunks. (Formato de vercel AI Data Stream Protocol)
                yield f'0:{json.dumps(chunk)}\n'
        except Exception as e:
            # No reenviar str(e) al navegador: puede incluir detalles crudos del
            # SDK del proveedor de IA (base_url, cuerpo de error, etc.).
            logger.exception("Error en stream de asistente")
            yield f'3:{json.dumps("Error al generar la respuesta")}\n'
            
        # 6. Registrar uso una vez terminado el stream
        try:
            # Como la sesión original podría haber sido cerrada por fastapi, 
            # necesitamos una nueva sesión o usar background_tasks.
            # Aquí lo simplificaremos haciendo el await directo, pero
            # StreamingResponse retrasa la ejecución, por lo que usar session=Depends
            # es peligroso si se cierra antes de terminar de yield. 
            # AsyncSession se debe manejar con cuidado en StreamingResponse.
            pass
        except Exception as e:
            pass

        if usage_stats:
            logger.info(f"Asistente Uso - Org: {x_org_id}, Stats: {usage_stats}")
            # Idealmente registrar en DB:
            # await registrar_uso(...)

    # Aquí resolvemos el problema de la sesión en StreamingResponse creando
    # una closure que abra su propia sesión efímera para guardar el uso.
    from database import AsyncSessionLocal
    
    async def sse_generator_with_usage() -> AsyncGenerator[str, None]:
        usage_stats = {}
        
        try:
            async for chunk in completar_stream(
                mensajes=mensajes_llm,
                system=system_prompt,
                max_tokens=1000,
                temperatura=0.1,
                usage_stats=usage_stats
            ):
                # Formato Vercel AI SDK stream: 
                # texto chunk -> 0:"..."
                yield f'0:{json.dumps(chunk)}\n'
        except Exception as e:
            # No reenviar str(e) al navegador: puede incluir detalles crudos del
            # SDK del proveedor de IA (base_url, cuerpo de error, etc.).
            logger.exception("Error en stream de asistente")
            yield f'3:{json.dumps("Error al generar la respuesta")}\n'
            
        if usage_stats:
            try:
                async with AsyncSessionLocal() as stream_session:
                    await registrar_uso(
                        org_id=internal_org_id,
                        session=stream_session,
                        tokens_entrada=usage_stats.get("prompt_tokens", 0),
                        tokens_entrada_cache=usage_stats.get("prompt_cache_hit_tokens", 0),
                        tokens_salida=usage_stats.get("completion_tokens", 0)
                    )
            except Exception as e:
                logger.error(f"No se pudo registrar uso de IA: {e}")

    return StreamingResponse(sse_generator_with_usage(), media_type="text/event-stream")
