/**
 * Fuente única de las reglas de plan (Free / Pro / Enterprise).
 *
 * La tabla de precios de la landing prometía "5 clasificaciones al mes" en Free
 * sin que ningún código lo aplicara (auditoría 2026-10-01, F-11). Los límites y
 * las comprobaciones viven aquí y las rutas de la API los consumen.
 */

export const LIMITE_CLASIFICACIONES_FREE_MES = 5;

export interface OrgPlan {
  plan: "free" | "pro" | "enterprise" | string | null;
  suscripcion_activa: boolean | null;
}

/** Pro de pago (suscripción activa en Stripe) o Enterprise contratado fuera de Stripe. */
export function tieneAccesoPro(org: OrgPlan | null | undefined): boolean {
  return Boolean(org?.suscripcion_activa) || org?.plan === "enterprise";
}

/** Primer instante (UTC) del mes natural en curso. */
export function inicioDeMes(ahora: Date = new Date()): string {
  return new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1)).toISOString();
}

export interface EstadoCuota {
  limitado: boolean;
  usadas: number;
  limite: number | null;
}

export function evaluarCuotaClasificaciones(org: OrgPlan | null | undefined, usadasEsteMes: number): EstadoCuota {
  if (tieneAccesoPro(org)) return { limitado: false, usadas: usadasEsteMes, limite: null };
  return {
    limitado: usadasEsteMes >= LIMITE_CLASIFICACIONES_FREE_MES,
    usadas: usadasEsteMes,
    limite: LIMITE_CLASIFICACIONES_FREE_MES,
  };
}
