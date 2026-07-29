import { calcularPlazo } from "./plazos";
import type { PlanTramitacion, TramitesEstadoMap } from "@/types/plan";

/** A partir de cuántos días o menos hasta el vencimiento se avisa. */
export const UMBRAL_PROXIMO_DIAS = 5;

export type TipoNotificacion = "plazo_proximo" | "plazo_vencido";

export interface NotificacionPlazo {
  orgId: string;
  expedienteId: string;
  tramiteOrden: number;
  tipo: TipoNotificacion;
  diasRestantes: number;
  mensaje: string;
}

export interface ExpedienteParaNotificar {
  id: string;
  org_id: string;
  comunidad: string;
  plan_tramitacion: PlanTramitacion | null;
  tramites_estado: TramitesEstadoMap | null;
}

/**
 * Calcula qué trámites en curso están próximos a vencer o ya vencidos, para
 * cada expediente dado. Función pura: no toca Supabase ni el reloj más allá
 * de lo que ya hace calcularPlazo() (que usa "hoy" en huso horario de Madrid).
 *
 * Reutiliza calcularPlazo (lib/plazos.ts) — el mismo cálculo de días hábiles
 * que ya se muestra en la ficha de cada trámite — para no tener dos fuentes
 * de verdad divergentes sobre cuándo vence un plazo.
 */
export function calcularNotificacionesPlazos(
  expedientes: ExpedienteParaNotificar[]
): NotificacionPlazo[] {
  const notificaciones: NotificacionPlazo[] = [];

  for (const expediente of expedientes) {
    const tramites = expediente.plan_tramitacion?.tramites ?? [];
    const estados = expediente.tramites_estado ?? {};

    for (const tramite of tramites) {
      const info = estados[String(tramite.orden)];
      const plazo = calcularPlazo(info, tramite.plazo_legal_dias, expediente.comunidad);
      if (!plazo || plazo.diasRestantes === null) continue;

      if (plazo.vencido) {
        const retraso = Math.abs(plazo.diasRestantes);
        notificaciones.push({
          orgId: expediente.org_id,
          expedienteId: expediente.id,
          tramiteOrden: tramite.orden,
          tipo: "plazo_vencido",
          diasRestantes: plazo.diasRestantes,
          mensaje: `El trámite "${tramite.nombre}" ha superado su plazo legal (${retraso} ${retraso === 1 ? "día" : "días"} de retraso).`,
        });
      } else if (plazo.diasRestantes <= UMBRAL_PROXIMO_DIAS) {
        notificaciones.push({
          orgId: expediente.org_id,
          expedienteId: expediente.id,
          tramiteOrden: tramite.orden,
          tipo: "plazo_proximo",
          diasRestantes: plazo.diasRestantes,
          mensaje:
            plazo.diasRestantes === 0
              ? `El trámite "${tramite.nombre}" vence hoy.`
              : `El trámite "${tramite.nombre}" vence en ${plazo.diasRestantes} ${plazo.diasRestantes === 1 ? "día" : "días"}.`,
        });
      }
    }
  }

  return notificaciones;
}
