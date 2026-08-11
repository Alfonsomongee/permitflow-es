"use client";

import {
  useState,
  useRef,
  useEffect,
  type KeyboardEvent,
} from "react";
import {
  MessageSquare,
  X,
  Send,
  Loader2,
  Trash2,
  Bot,
  User,
  AlertTriangle,
  Flag,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useDeepSeekChat } from "./useDeepSeekChat";
import { useChatContextStore } from "@/store/use-chat-context-store";
import { DecryptedText } from "@/components/ui/decrypted-text";

// ─── Burbuja del mensaje ──────────────────────────────────────────────────────

function MessageBubble({
  role,
  content,
  id,
  onReport,
}: {
  role: "user" | "assistant";
  content: string;
  id?: string;
  /** Solo aplica a mensajes del asistente ya persistidos (mejoras 2026-08-07) */
  onReport?: (mensajeId: string, contenido: string) => Promise<boolean>;
}) {
  const isUser = role === "user";
  const [reportando, setReportando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [reportado, setReportado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const enviarReporte = async () => {
    if (!id || !onReport || !motivo.trim()) return;
    setEnviando(true);
    const ok = await onReport(id, motivo.trim());
    setEnviando(false);
    if (ok) {
      setReportado(true);
      setReportando(false);
      toast.success("Gracias, lo revisaremos.");
    } else {
      toast.error("No se pudo enviar el reporte.");
    }
  };

  return (
    <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
      <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        {/* Avatar */}
        <div
          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-white mt-0.5 ${
            isUser ? "bg-primary" : "bg-neutral-600"
          }`}
        >
          {isUser ? (
            <User size={12} aria-hidden />
          ) : (
            <Bot size={12} aria-hidden />
          )}
        </div>

        {/* Burbuja */}
        <div
          className={`group/bubble max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "rounded-tr-sm bg-primary text-white"
              : "rounded-tl-sm bg-surface border border-border text-text-primary"
          }`}
        >
          {isUser ? (
            /* Mensajes del usuario: texto plano */
            content.split("\n").map((line, i) => (
              <span key={i}>
                {line}
                {i < content.split("\n").length - 1 && <br />}
              </span>
            ))
          ) : (
            /* Respuestas del asistente: aparición progresiva limpia con cadencia natural */
            <DecryptedText
              text={content}
              speed={16}
              animate
            />
          )}
        </div>

        {/* Reportar respuesta incorrecta: solo asistente, solo una vez
            persistido el mensaje (tiene id) -- mejoras 2026-08-07. */}
        {!isUser && id && onReport && !reportado && (
          <button
            onClick={() => setReportando((v) => !v)}
            className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center self-start rounded text-text-secondary/40 opacity-0 transition-opacity hover:text-danger group-hover/bubble:opacity-100"
            title="Reportar respuesta incorrecta"
            aria-label="Reportar respuesta incorrecta"
          >
            <Flag size={11} aria-hidden />
          </button>
        )}
        {!isUser && reportado && (
          <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center self-start text-success" title="Reportado">
            <Check size={11} aria-hidden />
          </span>
        )}
      </div>

      {reportando && !reportado && (
        <div className="ml-8 flex w-[75%] flex-col gap-1.5 rounded-lg border border-border bg-surface p-2">
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="¿Qué está mal en esta respuesta?"
            rows={2}
            className="resize-none rounded-md border border-border bg-bg px-2 py-1 text-xs text-text-primary outline-none focus:border-primary"
          />
          <div className="flex justify-end gap-1.5">
            <button
              onClick={() => setReportando(false)}
              className="rounded-md px-2 py-1 text-[11px] text-text-secondary hover:bg-bg"
            >
              Cancelar
            </button>
            <button
              onClick={enviarReporte}
              disabled={!motivo.trim() || enviando}
              className="rounded-md bg-danger/10 px-2 py-1 text-[11px] font-medium text-danger hover:bg-danger/20 disabled:opacity-50"
            >
              {enviando ? "Enviando…" : "Enviar reporte"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Widget principal ─────────────────────────────────────────────────────────

const SUGGESTED_QUESTIONS = [
  "¿Qué documentos necesito para empezar?",
  "¿Cuánto tiempo tarda el trámite más largo?",
  "¿Cuál es el coste total estimado?",
  "¿Puedo tramitarlo telemáticamente?",
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Contexto del expediente activo, publicado por SetChatContext desde la
  // página del expediente (ChatWidget vive en el layout compartido, no
  // puede recibirlo como prop -- mejoras 2026-08-07).
  const { expedienteId, comunidad, tecnologia } = useChatContextStore();

  const { messages, loading, error, sendMessage, clearChat, reportMessage } = useDeepSeekChat({
    expedienteId,
    comunidad,
    tecnologia,
  });

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  // Focus en input al abrir
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    await sendMessage(text);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasContext = !!(comunidad && tecnologia);

  return (
    <>
      {/* Panel de chat */}
      {open && (
        <div
          className="fixed bottom-20 right-5 z-50 flex h-[520px] w-[360px] flex-col rounded-2xl border border-border bg-bg shadow-xl"
          role="dialog"
          aria-label="Asistente normativo PermitFlow"
        >
          {/* Cabecera */}
          <div className="flex items-center justify-between rounded-t-2xl border-b border-border bg-surface px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary">
                <Bot size={14} className="text-white" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Asistente normativo
                </p>
                <p className="text-[11px] text-text-secondary">
                  {hasContext
                    ? `Contexto: ${tecnologia?.replace(/_/g, " ")} · ${comunidad}`
                    : "Sin expediente activo"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary hover:bg-bg hover:text-danger transition-colors"
                  title="Limpiar conversación"
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary hover:bg-bg transition-colors"
                aria-label="Cerrar chat"
              >
                <X size={15} aria-hidden />
              </button>
            </div>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-text-secondary text-center pt-2">
                  {hasContext
                    ? "Pregúntame cualquier cosa sobre este expediente o sobre la normativa aplicable."
                    : "Pregúntame sobre normativa de instalaciones técnicas en España."}
                </p>
                {/* Sugerencias */}
                <div className="flex flex-col gap-1.5">
                  {(hasContext ? SUGGESTED_QUESTIONS : SUGGESTED_QUESTIONS.slice(0, 2)).map(
                    (q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="rounded-xl border border-border bg-surface px-3 py-2 text-left text-xs text-text-secondary hover:border-primary hover:text-primary transition-colors"
                      >
                        {q}
                      </button>
                    )
                  )}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <MessageBubble key={m.id ?? i} role={m.role} content={m.content} id={m.id} onReport={reportMessage} />
              ))
            )}

            {/* Indicador de carga */}
            {loading && (
              <div className="flex gap-2.5 items-center">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-neutral-600">
                  <Bot size={12} className="text-white" aria-hidden />
                </div>
                <div className="flex gap-1 rounded-2xl rounded-tl-sm border border-border bg-surface px-3.5 py-2.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-text-secondary animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex gap-2 items-start rounded-lg border border-danger/30 bg-danger-light px-3 py-2 text-xs text-danger-dark">
                <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" aria-hidden />
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border bg-surface rounded-b-2xl p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregunta sobre trámites, plazos, documentos…"
                rows={1}
                className="flex-1 resize-none rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 max-h-24 overflow-y-auto"
                style={{ height: "auto" }}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = `${Math.min(t.scrollHeight, 96)}px`;
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                aria-label="Enviar mensaje"
              >
                {loading ? (
                  <Loader2 size={15} className="animate-spin" aria-hidden />
                ) : (
                  <Send size={15} aria-hidden />
                )}
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-text-secondary/50">
              Enter para enviar · Shift+Enter nueva línea · DeepSeek
            </p>
          </div>
        </div>
      )}

      {/* Burbuja flotante */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all ${
          open
            ? "bg-neutral-600 hover:bg-neutral-700"
            : "bg-primary hover:opacity-90"
        }`}
        aria-label={open ? "Cerrar asistente" : "Abrir asistente normativo"}
      >
        {open ? (
          <X size={20} className="text-white" aria-hidden />
        ) : (
          <>
            <MessageSquare size={20} className="text-white" aria-hidden />
            {/* Pulso de atención (solo si no hay mensajes) */}
            {messages.length === 0 && (
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-success border-2 border-bg animate-pulse" />
            )}
          </>
        )}
      </button>
    </>
  );
}
