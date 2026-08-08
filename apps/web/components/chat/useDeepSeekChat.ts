"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { capturar } from "@/lib/analytics/posthog";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** Solo se rellena tras persistir en el backend (mejoras 2026-08-07):
   * permite reportar una respuesta concreta del asistente como incorrecta. */
  id?: string;
}

interface UseDeepSeekChatOptions {
  expedienteId?: string;
  comunidad?: string;
  tecnologia?: string;
}

interface UseDeepSeekChatReturn {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  historyLoaded: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
  reportMessage: (mensajeId: string, contenido: string) => Promise<boolean>;
}

const DEEPSEEK_API_URL = "/api/asistente";

export function useDeepSeekChat({
  expedienteId,
  comunidad,
  tecnologia,
}: UseDeepSeekChatOptions = {}): UseDeepSeekChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  // Ref para mantener historial actualizado dentro de callbacks sin stale closures
  const messagesRef = useRef<ChatMessage[]>([]);
  const conversacionIdRef = useRef<string | undefined>(undefined);

  // Al montar (o al cambiar de expediente), recuperamos la última
  // conversación guardada en vez de arrancar siempre en blanco -- antes el
  // chat era 100% efímero y se perdía al cerrar el widget (mejoras
  // 2026-08-07).
  useEffect(() => {
    let cancelado = false;
    setHistoryLoaded(false);
    conversacionIdRef.current = undefined;
    messagesRef.current = [];
    setMessages([]);

    const qs = expedienteId ? `?expediente_id=${encodeURIComponent(expedienteId)}` : "";
    fetch(`${DEEPSEEK_API_URL}/conversacion${qs}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelado || !data) return;
        conversacionIdRef.current = data.id;
        const historicos: ChatMessage[] = (data.mensajes ?? []).map(
          (m: { id: string; rol: string; contenido: string }) => ({
            id: m.id,
            role: m.rol === "assistant" ? "assistant" : "user",
            content: m.contenido,
          })
        );
        messagesRef.current = historicos;
        setMessages(historicos);
      })
      .catch(() => {
        // Sin historial no es un error para el usuario: simplemente empieza en blanco.
      })
      .finally(() => {
        if (!cancelado) setHistoryLoaded(true);
      });

    return () => {
      cancelado = true;
    };
  }, [expedienteId]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMsg: ChatMessage = { role: "user", content: text };
      const updated = [...messagesRef.current, userMsg];
      messagesRef.current = updated;
      setMessages([...updated]);
      setLoading(true);
      setError(null);

      // Sin el texto de la pregunta: solo que se usó el asistente y en qué
      // contexto (mejoras 2026-08-07).
      capturar("asistente_mensaje_enviado", {
        con_expediente: !!expedienteId,
        tecnologia,
      });

      try {
        const res = await fetch(DEEPSEEK_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mensajes: updated.map((m) => ({ role: m.role, content: m.content })),
            expediente_id: expedienteId,
            comunidad: comunidad,
            tecnologia: tecnologia,
            conversacion_id: conversacionIdRef.current,
          }),
        });

        if (!res.ok || !res.body) {
          const detail = await res.json().catch(() => ({}));
          throw new Error(detail?.error?.message ?? detail?.error ?? `Error ${res.status}`);
        }

        // Streaming SSE: pintamos la respuesta token a token.
        let content = "";
        const pintar = (texto: string, id?: string) => {
          const actual: ChatMessage[] = [
            ...updated,
            { role: "assistant", content: texto, id },
          ];
          messagesRef.current = actual;
          setMessages(actual);
        };
        pintar("");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let mensajeId: string | undefined;

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lineas = buffer.split("\n");
          buffer = lineas.pop() ?? "";
          for (const linea of lineas) {
            const l = linea.trim();
            // Data format is typically "0:"chunk""
            if (l.startsWith("0:")) {
                try {
                    const chunk = JSON.parse(l.slice(2));
                    if (chunk) {
                        content += chunk;
                        pintar(content);
                    }
                } catch {
                    // Ignore parsing errors for partial chunks
                }
            } else if (l.startsWith("3:")) {
                try {
                    const err = JSON.parse(l.slice(2));
                    setError(err);
                } catch {
                    setError("Error in stream");
                }
            } else if (l.startsWith("8:")) {
                // Metadatos de cierre: conversacion_id/mensaje_id (ver
                // routers/asistente.py). No es texto del modelo.
                try {
                    const meta = JSON.parse(l.slice(2));
                    if (meta?.conversacion_id) conversacionIdRef.current = meta.conversacion_id;
                    if (meta?.mensaje_id) mensajeId = meta.mensaje_id;
                } catch {
                    // Ignorar metadatos malformados: no es crítico para la conversación en curso.
                }
            }
          }
        }

        if (!content && !error) {
          pintar("Sin respuesta del modelo.");
        } else if (mensajeId) {
          pintar(content, mensajeId);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        setError(msg);
        // Rollback: retiramos el mensaje de asistente parcial/vacío para no
        // dejar una burbuja rota; el mensaje del usuario se conserva.
        messagesRef.current = updated;
        setMessages([...updated]);
      } finally {
        setLoading(false);
      }
    },
    [loading, expedienteId, comunidad, tecnologia, error]
  );

  const clearChat = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
    setError(null);
    conversacionIdRef.current = undefined;
  }, []);

  const reportMessage = useCallback(async (mensajeId: string, contenido: string) => {
    try {
      const res = await fetch(`${DEEPSEEK_API_URL}/reportar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje_id: mensajeId, contenido }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  return { messages, loading, error, historyLoaded, sendMessage, clearChat, reportMessage };
}
