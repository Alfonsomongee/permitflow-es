"use client";

import { useState, useCallback, useRef } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface UseDeepSeekChatOptions {
  expedienteId?: string;
  comunidad?: string;
  tecnologia?: string;
  systemPrompt?: string;
}

interface UseDeepSeekChatReturn {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
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
  // Ref para mantener historial actualizado dentro de callbacks sin stale closures
  const messagesRef = useRef<ChatMessage[]>([]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMsg: ChatMessage = { role: "user", content: text };
      const updated = [...messagesRef.current, userMsg];
      messagesRef.current = updated;
      setMessages([...updated]);
      setLoading(true);
      setError(null);

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
          }),
        });

        if (!res.ok || !res.body) {
          const detail = await res.json().catch(() => ({}));
          throw new Error(detail?.error?.message ?? detail?.error ?? `Error ${res.status}`);
        }

        // Streaming SSE: pintamos la respuesta token a token.
        let content = "";
        const pintar = (texto: string) => {
          const actual: ChatMessage[] = [
            ...updated,
            { role: "assistant", content: texto },
          ];
          messagesRef.current = actual;
          setMessages(actual);
        };
        pintar("");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

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
            }
          }
        }

        if (!content && !error) {
          pintar("Sin respuesta del modelo.");
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
  }, []);

  return { messages, loading, error, sendMessage, clearChat };
}
