/**
 * Cifras de cobertura normativa DERIVADAS de content/cobertura_normativa.ts
 * (generado desde los 85 JSON del motor). La web de marketing las usa en vez de
 * cifras escritas a mano: la auditoría 2026-10-01 encontró afirmaciones como
 * "Andalucía con sus cinco verticales totalmente verificados" (solo ACS lo está)
 * y una fecha de "última revisión" fijada a mano.
 */
import { COBERTURA_NORMATIVA } from "@/content/cobertura_normativa";
import { severidadDeVerificacion } from "@/lib/verificacion";

export interface ResumenCobertura {
  comunidades: number;
  verticales: number;
  combinaciones: number;
  /** Sin reservas: nivel "verificada" y sin estado de borrador. */
  verificadas: number;
  /** Con reservas / verificación parcial. */
  parciales: number;
  /** Borrador o contenido genérico sin verificar. */
  enBorrador: number;
  /** Combinaciones con un revisor humano identificado en el fichero. */
  conRevisorHumano: number;
  /** Fecha ISO más reciente de `ultima_revision`, o null. */
  ultimaRevision: string | null;
}

export function resumenCobertura(
  cobertura: typeof COBERTURA_NORMATIVA = COBERTURA_NORMATIVA
): ResumenCobertura {
  const verticales = new Set<string>();
  let verificadas = 0;
  let parciales = 0;
  let enBorrador = 0;
  let conRevisorHumano = 0;
  let ultima: string | null = null;

  for (const porTipo of Object.values(cobertura)) {
    for (const [tipo, combo] of Object.entries(porTipo)) {
      verticales.add(tipo);
      const { nivel } = severidadDeVerificacion(combo.nivelVerificacion, combo.estado);
      if (nivel === "ninguno") verificadas++;
      else if (nivel === "atencion") parciales++;
      else enBorrador++;
      if (combo.revisadoPor) conRevisorHumano++;
      if (combo.ultimaRevision && (!ultima || combo.ultimaRevision > ultima)) {
        ultima = combo.ultimaRevision;
      }
    }
  }

  return {
    comunidades: Object.keys(cobertura).length,
    verticales: verticales.size,
    combinaciones: verificadas + parciales + enBorrador,
    verificadas,
    parciales,
    enBorrador,
    conRevisorHumano,
    ultimaRevision: ultima,
  };
}

/** "2026-08-09" -> "agosto de 2026" */
export function mesYAnio(iso: string | null): string {
  if (!iso) return "sin fecha";
  const fecha = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(fecha.getTime())) return "sin fecha";
  return new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" }).format(fecha);
}

/** Resumen de una comunidad: cuántos de sus verticales están verificados (sin reservas). */
export function verificadasEnComunidad(
  comunidad: string,
  cobertura: typeof COBERTURA_NORMATIVA = COBERTURA_NORMATIVA
): { verificadas: number; total: number } {
  const combos = Object.values(cobertura[comunidad] ?? {});
  const verificadas = combos.filter(
    (c) => severidadDeVerificacion(c.nivelVerificacion, c.estado).nivel === "ninguno"
  ).length;
  return { verificadas, total: combos.length };
}
