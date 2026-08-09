import json
import logging
from typing import Type, TypeVar

import httpx
from openai import AsyncOpenAI
from pydantic import BaseModel, ValidationError

from config import settings

logger = logging.getLogger(__name__)

# --- Configuración del proveedor activo ---
# Diseñado para cambiar a Claude modificando api_key, base_url y model
#
# timeout: sin él, una petición colgada bloquea la corrutina indefinidamente.
# max_retries: el SDK de OpenAI ya implementa backoff exponencial para errores
# de conexión, 429 y 5xx — no hace falta añadir Tenacity.

_client = AsyncOpenAI(
    api_key=settings.DEEPSEEK_API_KEY,
    base_url="https://api.deepseek.com",
    timeout=httpx.Timeout(45.0, connect=5.0),
    max_retries=3,
)

T = TypeVar("T", bound=BaseModel)

DEFAULT_MODEL = "deepseek-chat"

async def completar(
    prompt: str,
    system: str = "",
    max_tokens: int = 1000,
    temperatura: float = 0.1,
    json_mode: bool = False,
) -> str:
    """
    Interfaz única para llamadas de IA.
    Devuelve el texto de la respuesta como string.
    Si json_mode=True, fuerza respuesta JSON válida.
    """
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    kwargs = {
        "model": DEFAULT_MODEL,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperatura,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    response = await _client.chat.completions.create(**kwargs)
    return response.choices[0].message.content

async def completar_con_pdf(
    prompt: str,
    pdf_texto: str,
    system: str = "",
    max_tokens: int = 2000,
) -> str:
    """
    Para procesar PDFs normativos.
    El PDF se pasa como texto extraído, no como binario.
    """
    prompt_completo = f"{prompt}\n\nTexto del documento:\n{pdf_texto}"
    return await completar(prompt_completo, system=system, max_tokens=max_tokens)


async def completar_estructurado(
    prompt: str,
    schema: Type[T],
    system: str = "",
    max_tokens: int = 2000,
    reintentos_validacion: int = 1,
) -> T:
    """
    Llamada con salida validada contra un modelo Pydantic.

    Pensada para el pipeline BOE: la superficie de error principal es la
    interpretación del LLM, no la API — un JSON malformado o con campos
    inventados no debe propagarse silenciosamente al motor normativo.

    Si la validación falla, re-pregunta al modelo adjuntando los errores
    (hasta `reintentos_validacion` veces). Si sigue fallando, propaga
    ValidationError: el llamante decide (log + cola de revisión humana).
    """
    respuesta = await completar(
        prompt, system=system, max_tokens=max_tokens, json_mode=True
    )

    for intento in range(reintentos_validacion + 1):
        try:
            return schema.model_validate_json(respuesta)
        except ValidationError as exc:
            if intento >= reintentos_validacion:
                logger.error(
                    f"Salida LLM no válida contra {schema.__name__} tras "
                    f"{reintentos_validacion + 1} intentos: {exc.error_count()} errores"
                )
                raise
            logger.warning(
                f"Salida LLM inválida contra {schema.__name__}; "
                f"re-preguntando (intento {intento + 1})"
            )
            prompt_correccion = (
                f"{prompt}\n\n"
                f"Tu respuesta anterior fue:\n{respuesta}\n\n"
                f"No cumple el esquema requerido. Errores de validación:\n{exc}\n\n"
                f"Devuelve ÚNICAMENTE el objeto JSON corregido, sin texto adicional."
            )
            respuesta = await completar(
                prompt_correccion, system=system, max_tokens=max_tokens, json_mode=True
            )

    raise RuntimeError("unreachable")  # satisface al type-checker

from typing import AsyncIterator, List, Dict, Any

async def completar_stream(
    mensajes: List[Dict[str, str]],
    system: str = "",
    max_tokens: int = 1000,
    temperatura: float = 0.1,
    usage_stats: dict = None,
) -> AsyncIterator[str]:
    """
    Streaming de IA, ideado para el asistente conversacional.
    Usa stream_options={"include_usage": True} para extraer contadores de tokens
    en el chunk final (chunk.usage).
    
    Si se proporciona `usage_stats`, se poblará in-place con las estadísticas:
      usage_stats["prompt_tokens"]
      usage_stats["completion_tokens"]
      usage_stats["prompt_cache_hit_tokens"] (DeepSeek específico, opcional)
    """
    msgs = []
    if system:
        msgs.append({"role": "system", "content": system})
    msgs.extend(mensajes)

    kwargs = {
        "model": DEFAULT_MODEL,
        "messages": msgs,
        "max_tokens": max_tokens,
        "temperature": temperatura,
        "stream": True,
        "stream_options": {"include_usage": True}
    }

    response = await _client.chat.completions.create(**kwargs)
    
    async for chunk in response:
        # Extraer usage del chunk final (en DeepSeek / OpenAI, viene en un chunk vacío al final si include_usage=True)
        if hasattr(chunk, "usage") and chunk.usage:
            if usage_stats is not None:
                usage_stats["prompt_tokens"] = chunk.usage.prompt_tokens
                usage_stats["completion_tokens"] = chunk.usage.completion_tokens
                
                # DeepSeek expone prompt_cache_hit_tokens dentro de prompt_tokens_details
                if hasattr(chunk.usage, "prompt_tokens_details") and chunk.usage.prompt_tokens_details:
                    cache_hits = getattr(chunk.usage.prompt_tokens_details, "cached_tokens", 0)
                    if hasattr(chunk.usage.prompt_tokens_details, "prompt_cache_hit_tokens"):
                        cache_hits = chunk.usage.prompt_tokens_details.prompt_cache_hit_tokens
                    usage_stats["prompt_cache_hit_tokens"] = cache_hits

        # Extraer el texto del delta
        if chunk.choices and len(chunk.choices) > 0:
            delta = chunk.choices[0].delta
            if delta and delta.content:
                yield delta.content


async def completar_con_tools_stream(
    mensajes: List[Dict[str, str]],
    system: str,
    tools: List[Dict[str, Any]],
    ejecutar_tool,
    max_tokens: int = 1000,
    temperatura: float = 0.1,
    usage_stats: dict = None,
    max_rondas_tool: int = 3,
) -> AsyncIterator[str]:
    """
    Variante de completar_stream() con tool calling (function calling estilo
    OpenAI; DeepSeek es API-compatible -- ver
    https://api-docs.deepseek.com/guides/function_calling).

    `ejecutar_tool` es un callable async `(nombre: str, argumentos: dict) -> str`
    que ejecuta la herramienta y devuelve el resultado como texto (ver
    servicios/asistente_tools.py). No debe lanzar: si falla, debe devolver un
    string explicando el error, para que el LLM pueda reaccionar en vez de
    romper el turno completo.

    Simplificación deliberada frente a completar_stream(): las rondas de
    decisión de herramienta se hacen SIN streaming (una tool call es un JSON
    completo, no tiene sentido "escribirlo a máquina" token a token), y la
    respuesta final -- una vez resueltas las herramientas, o si el modelo no
    pide ninguna -- se entrega en un único chunk en vez de token a token. Es
    peor efecto "máquina de escribir" en el turno final, pero evita
    reimplementar el parseo incremental de tool_calls en modo streaming (los
    deltas llegan fragmentados por índice de tool call) para un beneficio de
    UX menor en el turno final. Si en el futuro hace falta streaming real del
    turno final, sustituir el `yield` final por una llamada adicional con
    stream=True reutilizando `msgs` ya resueltos.
    """
    msgs: List[Dict[str, Any]] = []
    if system:
        msgs.append({"role": "system", "content": system})
    msgs.extend(mensajes)

    for _ronda in range(max_rondas_tool):
        response = await _client.chat.completions.create(
            model=DEFAULT_MODEL,
            messages=msgs,
            max_tokens=max_tokens,
            temperature=temperatura,
            tools=tools,
            tool_choice="auto",
        )

        if usage_stats is not None and response.usage:
            usage_stats["prompt_tokens"] = (
                usage_stats.get("prompt_tokens", 0) + response.usage.prompt_tokens
            )
            usage_stats["completion_tokens"] = (
                usage_stats.get("completion_tokens", 0) + response.usage.completion_tokens
            )

        choice_msg = response.choices[0].message
        tool_calls = choice_msg.tool_calls or []

        if not tool_calls:
            yield choice_msg.content or ""
            return

        msgs.append({
            "role": "assistant",
            "content": choice_msg.content,
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                }
                for tc in tool_calls
            ],
        })

        for tc in tool_calls:
            try:
                args = json.loads(tc.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}
            try:
                resultado = await ejecutar_tool(tc.function.name, args)
            except Exception as exc:  # noqa: BLE001 — un fallo de tool no debe tumbar el chat
                logger.exception(f"Error ejecutando tool '{tc.function.name}'")
                resultado = f"Error interno consultando esta información: {exc}"
            msgs.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": resultado,
            })

    yield (
        "No he podido resolver tu consulta usando las herramientas disponibles "
        "tras varios intentos. Intenta reformular la pregunta."
    )

