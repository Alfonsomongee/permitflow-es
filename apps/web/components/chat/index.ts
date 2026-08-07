export { ChatWidget } from "./ChatWidget";
export { useDeepSeekChat } from "./useDeepSeekChat";

/**
 * Notas de integración del chat:
 * - <ChatWidget /> se monta una única vez en app/(dashboard)/layout.tsx,
 *   sin props: es compartido por todas las páginas del dashboard.
 * - Para dar contexto de un expediente concreto al asistente, la página
 *   correspondiente publica ese contexto con
 *   components/plan-tramitacion/SetChatContext.tsx, que escribe en
 *   store/use-chat-context-store.ts. ChatWidget lee de ahí.
 * - El navegador siempre pasa por apps/web/app/api/asistente/route.ts
 *   (y /conversacion, /reportar) -- la clave de DeepSeek/backend nunca
 *   llega al cliente.
 */
