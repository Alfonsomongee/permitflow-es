import { create } from "zustand";

/**
 * Contexto del expediente activo para el asistente de chat.
 *
 * ChatWidget vive en el layout compartido de (dashboard) (una sola vez,
 * fuera del árbol de cualquier página concreta), así que no puede recibir
 * `plan`/`params` como props directas de la página de un expediente --
 * layout.tsx renderiza <ChatWidget /> sin props y siempre lo ha hecho.
 * Antes de este store, ChatWidget aceptaba esas props pero nunca las
 * recibía de nadie: el asistente nunca supo en qué expediente estaba el
 * usuario (mejoras 2026-08-07). Las páginas que quieran dar contexto al
 * asistente llaman a setContext() en un efecto al montar y clearContext()
 * al desmontar.
 */
interface ChatContextState {
  expedienteId?: string;
  comunidad?: string;
  tecnologia?: string;
  setContext: (ctx: { expedienteId: string; comunidad: string; tecnologia: string }) => void;
  clearContext: () => void;
}

export const useChatContextStore = create<ChatContextState>((set) => ({
  expedienteId: undefined,
  comunidad: undefined,
  tecnologia: undefined,
  setContext: (ctx) => set(ctx),
  clearContext: () =>
    set({ expedienteId: undefined, comunidad: undefined, tecnologia: undefined }),
}));
