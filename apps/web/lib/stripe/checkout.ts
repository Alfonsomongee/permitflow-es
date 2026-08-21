/**
 * apps/web/lib/stripe/checkout.ts
 *
 * Origen: auditoría UX 2026-08-21 -- el CTA "Empezar prueba gratis" del plan
 * Pro (PreciosSection) enlazaba a /sign-up?plan=pro, un query param que
 * nunca se leía en ningún sitio del repo. POST /api/stripe/checkout ya
 * creaba la sesión de Stripe correctamente, pero ningún componente lo
 * llamaba: no existía ningún camino real para pasar de Free a Pro.
 * Helper compartido por los tres puntos de entrada al upgrade
 * (PreciosSection, AjustesTabs, paywall de DocumentosPanel).
 */
export async function crearSesionCheckoutPro(): Promise<string> {
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan: "pro" }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) {
    throw new Error(data.error || "No se pudo iniciar el proceso de pago.");
  }
  return data.url as string;
}
