"""Tests de contrato para los schemas nuevos del historial de chat del
asistente (mejoras 2026-08-07). No hay infraestructura de BD de pruebas en
este repo (ver apps/api/tests/*), así que esto cubre la parte verificable
sin una sesión async real: que los schemas aceptan/rechazan lo esperado."""
import uuid

import pytest
from pydantic import ValidationError

from schemas.asistente import (
    AsistenteChatRequest,
    AsistenteConversacionOut,
    AsistenteMensajeOut,
    AsistenteMensajeRequest,
    AsistenteReporteRequest,
)


def test_chat_request_sin_conversacion_id_es_valido():
    # Primer turno: no hay conversación previa todavía.
    req = AsistenteChatRequest(mensajes=[AsistenteMensajeRequest(role="user", content="Hola")])
    assert req.conversacion_id is None


def test_chat_request_acepta_conversacion_id_para_continuar():
    conv_id = uuid.uuid4()
    req = AsistenteChatRequest(
        mensajes=[AsistenteMensajeRequest(role="user", content="¿Y el plazo?")],
        conversacion_id=conv_id,
    )
    assert req.conversacion_id == conv_id


def test_reporte_request_exige_contenido_no_vacio():
    with pytest.raises(ValidationError):
        AsistenteReporteRequest(mensaje_id=uuid.uuid4(), contenido="")


def test_reporte_request_valido():
    mensaje_id = uuid.uuid4()
    req = AsistenteReporteRequest(mensaje_id=mensaje_id, contenido="La respuesta cita un artículo que no existe.")
    assert req.mensaje_id == mensaje_id


def test_conversacion_out_serializa_mensajes_en_orden():
    conv_id = uuid.uuid4()
    m1 = AsistenteMensajeOut(id=uuid.uuid4(), rol="user", contenido="Hola", creado_en="2026-08-07T10:00:00Z")
    m2 = AsistenteMensajeOut(id=uuid.uuid4(), rol="assistant", contenido="¡Hola!", creado_en="2026-08-07T10:00:05Z")
    out = AsistenteConversacionOut(id=conv_id, expediente_id=None, mensajes=[m1, m2])
    assert out.mensajes[0].rol == "user"
    assert out.mensajes[1].rol == "assistant"
    assert out.expediente_id is None
