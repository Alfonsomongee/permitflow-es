/**
 * Fase comercial del expediente (roadmap de mejoras, PREM-02). Independiente
 * de `estado` (administrativo): ver comentario de la migración
 * 20260822090000_fase_comercial.sql para la distinción completa.
 */
export type FaseComercial =
  | "prospeccion"
  | "simulacion_enviada"
  | "clasificado"
  | "en_tramitacion"
  | "aprobado"
  | "rechazado";

export const FASES_COMERCIALES_ORDEN: FaseComercial[] = [
  "prospeccion",
  "simulacion_enviada",
  "clasificado",
  "en_tramitacion",
  "aprobado",
  "rechazado",
];

export const FASE_COMERCIAL_LABEL: Record<FaseComercial, string> = {
  prospeccion: "Prospección",
  simulacion_enviada: "Simulación enviada",
  clasificado: "Clasificado",
  en_tramitacion: "En tramitación",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

export function esFaseComercial(valor: string): valor is FaseComercial {
  return (FASES_COMERCIALES_ORDEN as string[]).includes(valor);
}

/** Agrupa cualquier lista con fase_comercial en columnas, en el orden fijo
 * de FASES_COMERCIALES_ORDEN -- para el kanban de PREM-02. Genérico en el
 * tipo de entrada para no acoplar esta función pura a un shape concreto de
 * expediente (la usan tanto el tipo de UI de la tabla como, potencialmente,
 * datos más completos). */
export function agruparPorFase<T extends { fase_comercial: FaseComercial }>(
  items: T[]
): Record<FaseComercial, T[]> {
  const grupos = Object.fromEntries(
    FASES_COMERCIALES_ORDEN.map((fase) => [fase, [] as T[]])
  ) as Record<FaseComercial, T[]>;
  for (const item of items) {
    grupos[item.fase_comercial].push(item);
  }
  return grupos;
}
