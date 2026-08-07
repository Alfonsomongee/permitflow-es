import json
import logging
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select

from models.expediente import Expediente
from schemas.asistente import AsistenteChatRequest
from servicios.ai_client import completar_stream
from servicios.asistente_context import construir_contexto
from servicios.asistente_presupuesto import verificar_presupuesto, registrar_uso
from servicios.tenant_context import TenantContext, get_tenant_context, set_tenant_context
# from models.asistente import AsistenteConversacion, AsistenteMensaje (para guardar historial, si se quiere, por ahora lo simplificaremos)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/asistente", tags=["asistente"])

@router.post("/chat")
async def chat_asistente(
    request: AsistenteChatRequest,
    ctx: TenantContext = Depends(get_tenant_context),
):
    # 0. Organización ya resuelta y contexto de tenant (app.current_org_id)
    # ya fijado en la sesión por la dependencia get_tenant_context (B-05 paso b).
    session = ctx.session
    internal_org_id = ctx.org_id

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

    # 5. Configurar el stream SSE y registrar uso al final.
    # La sesión original (`session`, con app.current_org_id ya fijado por
    # get_tenant_context) puede haber sido cerrada por FastAPI para cuando
    # termina el stream, así que se abre una sesión efímera aparte para el
    # INSERT de uso — y por eso hay que repetir set_tenant_context en ella
    # (B-05 paso b): el GUC es de ámbito de transacción/sesión, no global.
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
                    await set_tenant_context(stream_session, internal_org_id)
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
