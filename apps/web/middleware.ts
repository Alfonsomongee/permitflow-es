/**
 * apps/web/middleware.ts
 *
 * Clerk middleware para Next.js App Router.
 * - Rutas públicas: landing, sign-in, sign-up, API health
 * - Todo lo demás requiere sesión activa
 */
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",                    // landing
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/contacto",            // formulario público de contacto (D-11 auditoría 2026-08-06)
  "/api/health",
  "/api/contacto",        // proxy del formulario anterior; protegido por rate limit + honeypot en FastAPI
  "/api/cron(.*)",        // Vercel crons (se protegen a sí mismos con CRON_SECRET)
  "/api/webhooks(.*)",    // Stripe y Clerk: no llevan sesión Clerk, verifican firma propia
  "/portal(.*)",          // portal de cliente final: enlace sin cuenta (incluye subida de documentos)
  "/api/portal(.*)",      // API del portal público: mismo token opaco como única credencial, sin sesión Clerk
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Excluye archivos estáticos y _next internals
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
