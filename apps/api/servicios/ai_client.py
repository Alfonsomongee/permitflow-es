import json
from openai import AsyncOpenAI
from config import settings

# --- Configuración del proveedor activo ---
# Diseñado para cambiar a Claude modificando api_key, base_url y model

_client = AsyncOpenAI(
    api_key=settings.DEEPSEEK_API_KEY,
    base_url="https://api.deepseek.com",
)

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
