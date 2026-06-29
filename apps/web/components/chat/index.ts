export { ChatWidget } from "./ChatWidget";
export { useDeepSeekChat } from "./useDeepSeekChat";
export { buildSystemPrompt } from "./buildSystemPrompt";

/**
 * ─── INTEGRACIÓN EN EL LAYOUT DEL DASHBOARD ─────────────────────────────────
 *
 * Para que el ChatWidget esté disponible en TODA la app (incluida landing),
 * añádelo en `apps/web/app/layout.tsx` (el layout raíz):
 *
 * ```tsx
 * import { ChatWidget } from "@/components/chat";
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html lang="es">
 *       <body>
 *         {children}
 *         <ChatWidget />   // ← Sin contexto: modo general
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 *
 * Para inyectar el contexto del expediente (en la página del plan de tramitación),
 * usa la versión con props en `app/(dashboard)/expedientes/[id]/page.tsx`:
 *
 * ```tsx
 * import { ChatWidget } from "@/components/chat";
 *
 * export default async function PlanPage({ searchParams }) {
 *   const plan = await fetchPlan(params);
 *   // Importa el JSON de normativa del vertical:
 *   const normativaJson = await import(
 *     `@/../../api/motor_normativo/reglas/${params.comunidad}/${params.tipo_instalacion}.json`
 *   ).catch(() => null);
 *
 *   return (
 *     <>
 *       <PlanTramitacionView plan={plan} params={instalacionParams} />
 *       <ChatWidget
 *         plan={plan}
 *         params={instalacionParams}
 *         normativaJson={normativaJson?.default ?? null}
 *       />
 *     </>
 *   );
 * }
 * ```
 *
 * ─── VARIABLE DE ENTORNO ─────────────────────────────────────────────────────
 *
 * Añade en `apps/web/.env.local`:
 *   NEXT_PUBLIC_DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
 *
 * IMPORTANTE: En producción, nunca expongas la API key en el cliente.
 * Crea un endpoint proxy en `apps/api` o en `apps/web/app/api/chat/route.ts`
 * que llame a DeepSeek desde el servidor. Ver `route.ts` a continuación.
 *
 * ─── PROXY SERVER-SIDE (recomendado para producción) ─────────────────────────
 *
 * Crea `apps/web/app/api/chat/route.ts`:
 *
 * ```ts
 * import { NextRequest, NextResponse } from "next/server";
 *
 * export async function POST(req: NextRequest) {
 *   const body = await req.json();
 *   const res = await fetch("https://api.deepseek.com/chat/completions", {
 *     method: "POST",
 *     headers: {
 *       "Content-Type": "application/json",
 *       Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`, // ← server-side
 *     },
 *     body: JSON.stringify(body),
 *   });
 *   const data = await res.json();
 *   return NextResponse.json(data, { status: res.status });
 * }
 * ```
 *
 * Y cambia la URL en `useDeepSeekChat.ts`:
 *   const DEEPSEEK_API_URL = "/api/chat";   // ← proxy local
 */
