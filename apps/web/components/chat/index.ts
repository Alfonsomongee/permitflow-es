export { ChatWidget } from "./ChatWidget";
export { useDeepSeekChat } from "./useDeepSeekChat";
export { buildSystemPrompt } from "./buildSystemPrompt";

/**
 * Chat integration notes:
 * - Render ChatWidget with plan/params on expediente detail pages.
 * - Keep DEEPSEEK_API_KEY server-side only.
 * - Browser requests must go through apps/web/app/api/chat/route.ts.
 */
