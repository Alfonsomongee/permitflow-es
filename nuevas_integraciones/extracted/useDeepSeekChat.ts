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

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

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
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              { role: "system", content: systemPrompt },
              ...updated.map((m) => ({ role: m.role, content: m.content })),
            ],
            temperature: 0.3,   // Bajo para respuestas normativas precisas
            max_tokens: 1024,
            stream: false,
          }),
        });

        if (!res.ok) {
          const detail = await res.json().catch(() => ({}));
          throw new Error(detail?.error?.message ?? `Error ${res.status}`);
        }

        const data = await res.json();
        const assistantContent: string =
          data.choices?.[0]?.message?.content ?? "Sin respuesta del modelo.";

        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: assistantContent,
        };
        const withAssistant = [...updated, assistantMsg];
        messagesRef.current = withAssistant;
        setMessages([...withAssistant]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        setError(msg);
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
