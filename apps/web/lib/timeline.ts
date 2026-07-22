import type { Tramite } from "@/types/plan";

export interface TramiteSlot {
  orden: number;
  nombre: string;
  inicioDia: number;
  finDia: number;
  duracion: number;
  carril: number;
  paralelo: boolean;
}

export interface TimelineResult {
  slots: TramiteSlot[];
  duracionCritica: number;
  duracionSerie: number;
  carriles: number;
}

/**
 * Modelo: los trámites sin paralelo_con forman la cadena base secuencial.
 * Un trámite con paralelo_con=X arranca a la vez que X (carril propio).
 * El cursor avanza al máximo fin visto, así el siguiente trámite base
 * espera a que termine todo el grupo paralelo.
 */
export function calcularTimeline(tramites: Tramite[]): TimelineResult {
  const porOrden = new Map<number, TramiteSlot>();
  const attacheesPorTarget = new Map<number, number>();
  const slots: TramiteSlot[] = [];

  let cursor = 0;
  let serie = 0;
  let maxCarril = 0;

  for (const t of tramites) {
    const duracion = t.plazo_estimado_dias ?? 0;
    serie += duracion;

    const target =
      t.paralelo_con != null ? porOrden.get(t.paralelo_con) : undefined;

    let inicioDia: number;
    let carril: number;

    if (target) {
      inicioDia = target.inicioDia;
      const n = (attacheesPorTarget.get(target.orden) ?? 0) + 1;
      attacheesPorTarget.set(target.orden, n);
      carril = target.carril + n;
    } else {
      // Referencia irresoluble o ausente → secuencial (degradación segura)
      inicioDia = cursor;
      carril = 0;
    }

    const finDia = inicioDia + duracion;
    cursor = Math.max(cursor, finDia);
    maxCarril = Math.max(maxCarril, carril);

    const slot: TramiteSlot = {
      orden: t.orden,
      nombre: t.nombre,
      inicioDia,
      finDia,
      duracion,
      carril,
      paralelo: Boolean(target),
    };
    porOrden.set(t.orden, slot);
    slots.push(slot);
  }

  return { slots, duracionCritica: cursor, duracionSerie: serie, carriles: maxCarril + 1 };
}
