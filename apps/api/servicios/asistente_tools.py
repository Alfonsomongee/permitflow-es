"""
Herramientas (function calling) que puede invocar el asistente conversacional
sobre el expediente que el usuario tiene abierto.

Fase 2 de "bot que rellena trámites": antes, el asistente solo tenía el
contexto ya inyectado en el system prompt (construir_contexto en
asistente_context.py) — datos estáticos del momento en que se abrió la
conversación. Estas herramientas le permiten consultar, bajo demanda y en
tiempo real, dos cosas que NO estaban en ese contexto:

1. El estado real de avance de cada trámite (tramites_estado, que vive en la
   tabla expedientes y hoy solo se usaba para generar documentos, nunca se
   exponía al chat).
2. El catálogo real de ayudas/subvenciones (servicios/catalogo_ayudas.py) —
   antes el asistente solo sabía "solicita_ayuda: Sí/No" del expediente, sin
   ningún dato concreto de qué ayuda existe, su organismo, cuantía o plazo.

Diseño deliberadamente conservador: cada herramienta solo puede leer datos
del expediente que el propio router ya cargó con el filtro de organización
del tenant (ver routers/asistente.py) — no reciben org_id ni expediente_id
como argumento del LLM, así que no hay forma de que el modelo "pida" datos
de otro expediente ajeno a la conversación actual.
"""

from typing import Any, Optional

from servicios.ayudas import simular_ayudas

# Formato "tools" estilo OpenAI (DeepSeek es API-compatible) — ver
# https://api-docs.deepseek.com/guides/function_calling
TOOLS_SCHEMA: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "consultar_estado_tramites",
            "description": (
                "Consulta el estado real (pendiente, en_curso o completado) de cada "
                "trámite del plan de tramitación del expediente que el usuario tiene "
                "abierto en esta conversación, incluida la fecha de inicio/completado "
                "si existe. Usa esta herramienta siempre que el usuario pregunte qué le "
                "falta, qué ha completado ya, o por el progreso de su expediente -- "
                "nunca inventes ni asumas el estado de un trámite."
            ),
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "consultar_ayudas_disponibles",
            "description": (
                "Consulta el catálogo real de ayudas y subvenciones públicas "
                "(estatales y autonómicas) para la comunidad y tecnología del "
                "expediente actual, con organismo, estado de la convocatoria, cuantía "
                "y fuente oficial. Usa esta herramienta siempre que el usuario pregunte "
                "por ayudas, subvenciones, incentivos económicos o Next Generation EU "
                "-- nunca inventes organismos, cuantías, plazos ni estados de "
                "convocatoria que no vengan de esta herramienta."
            ),
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
]


def _formatear_estado_tramites(expediente: Any) -> str:
    tramites = (expediente.plan_tramitacion or {}).get("tramites", [])
    if not tramites:
        return "Este expediente no tiene ningún trámite en su plan."

    estados = expediente.tramites_estado or {}
    completados = 0
    lineas = []
    for t in tramites:
        orden = t.get("orden")
        info = estados.get(str(orden), {})
        estado = info.get("estado", "pendiente")
        if estado == "completado":
            completados += 1

        linea = f"  {orden}. {t.get('nombre')} — estado: {estado}"
        if info.get("fecha_completado"):
            linea += f" (completado el {info['fecha_completado']})"
        elif info.get("fecha_inicio"):
            linea += f" (iniciado el {info['fecha_inicio']})"
        lineas.append(linea)

    return (
        f"{completados} de {len(tramites)} trámites completados.\n"
        + "\n".join(lineas)
    )


def _formatear_ayudas_disponibles(expediente: Any) -> str:
    resultado = simular_ayudas(expediente.comunidad, expediente.tipo_instalacion)
    if not resultado.ayudas:
        return resultado.aviso

    lineas = [
        f"- {a.nombre} ({a.organismo}), estado: {a.estado}. {a.resumen_cuantia}. "
        f"Plazo: {a.plazo}. Fuente: {a.fuente_url}"
        for a in resultado.ayudas
    ]
    return f"{resultado.aviso}\n\nProgramas encontrados:\n" + "\n".join(lineas)


async def ejecutar_tool(nombre: str, argumentos: dict, expediente: Optional[Any]) -> str:
    """Despacha una tool call del LLM a la implementación real. Devuelve
    siempre un string (el "content" del mensaje role=tool) -- nunca lanza,
    para que un error de una herramienta no tumbe la ronda completa del chat."""
    if expediente is None:
        return (
            "No hay ningún expediente abierto en esta conversación: no se puede "
            "consultar esta información. Pide al usuario que abra un expediente."
        )

    try:
        if nombre == "consultar_estado_tramites":
            return _formatear_estado_tramites(expediente)
        if nombre == "consultar_ayudas_disponibles":
            return _formatear_ayudas_disponibles(expediente)
    except Exception as exc:  # noqa: BLE001 — nunca debe tumbar el turno del chat
        return f"Error interno consultando esta información: {exc}"

    return f"Herramienta desconocida: {nombre}"
