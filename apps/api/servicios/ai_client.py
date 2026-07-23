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
