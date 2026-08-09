import asyncio
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from servicios.ai_client import completar_con_tools_stream

# Este repo no tiene pytest-asyncio/anyio configurado para tests (ver
# tests/test_asistente_tools.py): se invocan las corrutinas con asyncio.run()
# dentro de tests síncronos normales.


def _tool_call(id_, nombre, argumentos: dict):
    return SimpleNamespace(
        id=id_,
        function=SimpleNamespace(name=nombre, arguments=json.dumps(argumentos)),
    )


def _respuesta(content=None, tool_calls=None, prompt_tokens=10, completion_tokens=5):
    return SimpleNamespace(
        usage=SimpleNamespace(prompt_tokens=prompt_tokens, completion_tokens=completion_tokens),
        choices=[SimpleNamespace(message=SimpleNamespace(content=content, tool_calls=tool_calls))],
    )


async def _consumir(generador):
    return [chunk async for chunk in generador]


def test_sin_tool_calls_devuelve_contenido_directo():
    respuesta = _respuesta(content="Hola, no necesito herramientas.", tool_calls=None)
    mock_create = AsyncMock(return_value=respuesta)
    ejecutar_tool = AsyncMock()

    with patch("servicios.ai_client._client.chat.completions.create", mock_create):
        usage_stats = {}
        chunks = asyncio.run(_consumir(completar_con_tools_stream(
            mensajes=[{"role": "user", "content": "hola"}],
            system="system prompt",
            tools=[],
            ejecutar_tool=ejecutar_tool,
            usage_stats=usage_stats,
        )))

    assert chunks == ["Hola, no necesito herramientas."]
    ejecutar_tool.assert_not_called()
    assert mock_create.await_count == 1
    assert usage_stats == {"prompt_tokens": 10, "completion_tokens": 5}


def test_ejecuta_tool_y_devuelve_respuesta_final():
    ronda_1 = _respuesta(
        content=None,
        tool_calls=[_tool_call("call_1", "consultar_estado_tramites", {})],
        prompt_tokens=20, completion_tokens=8,
    )
    ronda_2 = _respuesta(content="1 de 2 trámites completados.", tool_calls=None,
                          prompt_tokens=30, completion_tokens=12)
    mock_create = AsyncMock(side_effect=[ronda_1, ronda_2])
    ejecutar_tool = AsyncMock(return_value="resultado real de la tool")

    with patch("servicios.ai_client._client.chat.completions.create", mock_create):
        usage_stats = {}
        chunks = asyncio.run(_consumir(completar_con_tools_stream(
            mensajes=[{"role": "user", "content": "¿qué me falta?"}],
            system="system prompt",
            tools=[{"type": "function", "function": {"name": "consultar_estado_tramites"}}],
            ejecutar_tool=ejecutar_tool,
            usage_stats=usage_stats,
        )))

    assert chunks == ["1 de 2 trámites completados."]
    ejecutar_tool.assert_awaited_once_with("consultar_estado_tramites", {})
    assert mock_create.await_count == 2
    # El usage se acumula a través de las dos rondas, no se pisa
    assert usage_stats == {"prompt_tokens": 50, "completion_tokens": 20}

    # La segunda llamada al modelo debe incluir el resultado de la tool como
    # mensaje role=tool, para que el modelo pueda fundamentar su respuesta en él
    segunda_llamada_kwargs = mock_create.await_args_list[1].kwargs
    mensajes_enviados = segunda_llamada_kwargs["messages"]
    assert any(
        m.get("role") == "tool" and m.get("content") == "resultado real de la tool"
        for m in mensajes_enviados
    )


def test_tool_que_lanza_no_rompe_el_turno():
    ronda_1 = _respuesta(
        content=None,
        tool_calls=[_tool_call("call_1", "consultar_ayudas_disponibles", {})],
    )
    ronda_2 = _respuesta(content="Lo siento, hubo un problema consultando eso.", tool_calls=None)
    mock_create = AsyncMock(side_effect=[ronda_1, ronda_2])
    ejecutar_tool = AsyncMock(side_effect=RuntimeError("fallo simulado"))

    with patch("servicios.ai_client._client.chat.completions.create", mock_create):
        chunks = asyncio.run(_consumir(completar_con_tools_stream(
            mensajes=[{"role": "user", "content": "hola"}],
            system="",
            tools=[],
            ejecutar_tool=ejecutar_tool,
        )))

    assert chunks == ["Lo siento, hubo un problema consultando eso."]
    segunda_llamada_kwargs = mock_create.await_args_list[1].kwargs
    mensajes_tool = [m for m in segunda_llamada_kwargs["messages"] if m.get("role") == "tool"]
    assert len(mensajes_tool) == 1
    assert "fallo simulado" in mensajes_tool[0]["content"]


def test_agota_rondas_sin_resolver_da_mensaje_honesto():
    # El modelo siempre pide una tool call y nunca da una respuesta final:
    # tras max_rondas_tool intentos, debe rendirse con un mensaje claro en
    # vez de colgarse o lanzar.
    ronda_con_tool_call = _respuesta(
        content=None,
        tool_calls=[_tool_call("call_x", "consultar_estado_tramites", {})],
    )
    mock_create = AsyncMock(return_value=ronda_con_tool_call)
    ejecutar_tool = AsyncMock(return_value="resultado")

    with patch("servicios.ai_client._client.chat.completions.create", mock_create):
        chunks = asyncio.run(_consumir(completar_con_tools_stream(
            mensajes=[{"role": "user", "content": "hola"}],
            system="",
            tools=[],
            ejecutar_tool=ejecutar_tool,
            max_rondas_tool=2,
        )))

    assert len(chunks) == 1
    assert "No he podido resolver" in chunks[0]
    assert mock_create.await_count == 2
