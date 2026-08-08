/**
 * apps/web/lib/analytics/posthog.ts
 *
 * Cliente de PostHog (mejoras 2026-08-07). Antes NEXT_PUBLIC_POSTHOG_KEY/
 * NEXT_PUBLIC_POSTHOG_HOST existían en .env.example pero no había ni una
 * línea de código que los usara: cero analítica de producto real pese a
 * tener el proveedor "configurado".
 *
 * Decisiones deliberadas (no son el comportamiento por defecto de PostHog):
 *
 * - persistence: "memory" -- sin esto, PostHog usa cookies/localStorage
 *   para mantener un identificador entre sesiones, lo cual son cookies NO
 *   estrictamente necesarias y requerirían un banner de consentimiento
 *   (RGPD/ePrivacy) que este proyecto no tiene todavía. Con persistencia en
 *   memoria, el identificador no sobrevive a un refresco de página: es la
 *   opción conservadora para no necesitar ese banner. Si en el futuro se
 *   quiere tracking persistente entre sesiones, hay que construir el
 *   consentimiento ANTES, no cambiar esto sin más.
 * - autocapture: false -- solo se capturan los eventos explícitos que el
 *   código dispara a propósito (ver capturar()), nunca clicks/inputs
 *   genéricos que podrían incluir datos sensibles (p.ej. campos de un
 *   formulario con datos de factura).
 * - disable_session_recording: true -- no se graba pantalla; este producto
 *   maneja datos de instalaciones y facturas de clientes.
 * - Si no hay NEXT_PUBLIC_POSTHOG_KEY configurada (dev local, o mientras no
 *   se dé de alta un proyecto real), todo esto es un no-op silencioso.
 */
"use client";

import posthog from "posthog-js";

let inicializado = false;

export function initPostHog(): void {
  if (typeof window === "undefined" || inicializado) return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.posthog.com",
    persistence: "memory",
    autocapture: false,
    capture_pageview: false,
    disable_session_recording: true,
  });
  inicializado = true;
}

/** Captura un evento de producto. No-op si PostHog no está inicializado
 * (sin key configurada) -- seguro de llamar desde cualquier sitio sin
 * comprobar antes si el proveedor está activo. */
export function capturar(evento: string, propiedades?: Record<string, unknown>): void {
  if (typeof window === "undefined" || !inicializado) return;
  posthog.capture(evento, propiedades);
}

export function identificarUsuario(userId: string, propiedades?: Record<string, unknown>): void {
  if (typeof window === "undefined" || !inicializado) return;
  posthog.identify(userId, propiedades);
}

export function identificarOrganizacion(orgId: string, propiedades?: Record<string, unknown>): void {
  if (typeof window === "undefined" || !inicializado) return;
  posthog.group("organization", orgId, propiedades);
}

export function resetearIdentidad(): void {
  if (typeof window === "undefined" || !inicializado) return;
  posthog.reset();
}
