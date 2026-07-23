"use client";

import { useState, useCallback, useRef } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface UseDeepSeekChatOptions {
  /** Contexto del sistema: describe qué es PermitFlow, los verticales y la normativa activa */
  systemPrompt: string;
}

interface UseDeepSeekChatReturn {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
}

const DEEPSEEK_API_URL = "/api/chat";

export function useDeepSeekChat({
  systemPrompt,
}: UseDeepSeekChatOptions): UseDeepSeekChatReturn {
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
            model: "deepseek-chat",
            messages: [
              { role: "system", content: systemPrompt },
              ...updated.map((m) => ({ role: m.role, content: m.content })),
            ],
            temperature: 0.3,   // Bajo para respuestas normativas precisas
            max_tokens: 1024,
            stream: true,
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
            if (!l.startsWith("data:")) continue;
            const payload = l.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const chunk = JSON.parse(payload) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const delta = chunk.choices?.[0]?.delta?.content ?? "";
              if (delta) {
                content += delta;
                pintar(content);
              }
            } catch {
              // Chunk parcial o keep-alive: ignorar
            }
          }
        }

        if (!content) {
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
    [loading, systemPrompt]
  );

  const clearChat = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
    setError(null);
  }, []);

  return { messages, loading, error, sendMessage, clearChat };
}
