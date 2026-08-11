/**
 * Criterio único para contar trámites de un plan.
 *
 * Origen: auditoría QA 2026-08-11, hallazgo M-03. Había tres criterios
 * conviviendo en la misma pantalla: el panel lateral contaba solo los
 * accionables, la línea temporal dibujaba todos, y los días estimados sumaban
 * todos. El resultado en Madrid/fotovoltaica era "1 trámite · ~0 días" junto a
 * una línea temporal con dos barras.
 *
 * La distinción importa y por eso no basta con elegir un número:
 *
 * - `accionables` son las tareas del usuario. Es el número que tiene sentido
 *   como "trámites a realizar" y como denominador del progreso.
 * - `oficio` son actuaciones que hace la Administración por su cuenta. Ocupan
 *   tiempo en el calendario, así que salen en la línea temporal y cuentan para
 *   el plazo, pero el usuario no puede marcarlas ni "completarlas".
 * - `informativos` no son trámites: son avisos ("esta instalación está exenta").
 * - `revision` son casos que el motor no puede resolver y requieren criterio
 *   humano; se muestran aparte y destacados.
 */
import type { Tramite } from "@/types/plan";

export interface ConteoTramites {
  accionables: Tramite[];
  oficio: Tramite[];
  informativos: Tramite[];
  revision: Tramite[];
  /** Los que ocupan tiempo en el calendario: accionables + de oficio. */
  enCalendario: Tramite[];
}

export function contarTramites(tramites: Tramite[]): ConteoTramites {
  // `tipo_actuacion` es opcional en el JSON de normativa y 582 de 637 trámites
  // no lo declaran, así que `undefined` significa "acción del usuario".
  const accionables = tramites.filter(
    (t) => t.tipo_actuacion === "accion_usuario" || t.tipo_actuacion === undefined
  );
  const oficio = tramites.filter((t) => t.tipo_actuacion === "oficio_administracion");
  const informativos = tramites.filter((t) => t.tipo_actuacion === "informativa");
  const revision = tramites.filter((t) => t.tipo_actuacion === "revision_manual");

  return {
    accionables,
    oficio,
    informativos,
    revision,
    enCalendario: [...accionables, ...oficio],
  };
}

/** Texto del plazo total, distinguiendo "no lo sabemos" de "cero días". */
export function textoPlazoTotal(dias: number | null | undefined): {
  valor: string;
  etiqueta: string;
} {
  if (dias === null || dias === undefined) {
    return { valor: "—", etiqueta: "sin estimación de plazo" };
  }
  return { valor: `~${dias}`, etiqueta: "días estimados" };
}
