import type { Tramite } from "@/types/plan";

/** Umbral de privacidad: nunca se publica un agregado con menos de 5 casos. */
export const MUESTRA_MINIMA = 5;

/** Clave estable de un trámite para agrupar estadísticas: regla_id si existe
 * (expedientes clasificados tras añadir este campo), si no, el nombre — así
 * los expedientes anteriores siguen aportando muestra en vez de perderse. */
export function claveTramite(t: Pick<Tramite, "regla_id" | "nombre">): string {
  return t.regla_id?.trim() || `nombre:${t.nombre.trim().toLowerCase()}`;
}
