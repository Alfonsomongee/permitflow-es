import { describe, expect, it } from "vitest";

import { contarTramites, textoPlazoTotal } from "./tramites-conteo";
import type { Tramite } from "@/types/plan";

/**
 * Auditoría QA 2026-08-11, hallazgos M-03 y M-04. Tres criterios de conteo
 * convivían en la misma pantalla, y "~0 días" se leía como "inmediato" cuando
 * significaba "no lo sabemos".
 */

function tramite(orden: number, tipo?: Tramite["tipo_actuacion"]): Tramite {
  return {
    orden,
    nombre: `Trámite ${orden}`,
    tipo_actuacion: tipo,
    organismo: "Organismo",
    base_legal: "Norma",
    plazo_estimado_dias: null,
    plazo_legal_dias: null,
    documentos_requeridos: [],
    notas: null,
    plataforma: null,
    plataforma_url: null,
    coste_estimado: null,
  };
}

describe("contarTramites", () => {
  it("trata tipo_actuacion ausente como acción del usuario", () => {
    // 582 de los 637 trámites del motor no declaran tipo_actuacion.
    const { accionables } = contarTramites([tramite(1), tramite(2, "accion_usuario")]);
    expect(accionables).toHaveLength(2);
  });

  it("separa las cuatro naturalezas", () => {
    const conteo = contarTramites([
      tramite(1, "accion_usuario"),
      tramite(2, "oficio_administracion"),
      tramite(3, "informativa"),
      tramite(4, "revision_manual"),
    ]);
    expect(conteo.accionables).toHaveLength(1);
    expect(conteo.oficio).toHaveLength(1);
    expect(conteo.informativos).toHaveLength(1);
    expect(conteo.revision).toHaveLength(1);
  });

  it("no cuenta los informativos como tareas", () => {
    // Un "esta instalación está exenta" no es un trámite a realizar: si contara,
    // inflaría el contador y el denominador del progreso del expediente.
    const conteo = contarTramites([tramite(1, "informativa")]);
    expect(conteo.accionables).toHaveLength(0);
  });

  it("incluye los de oficio en el calendario pero no en las tareas", () => {
    // El caso real de Madrid/fotovoltaica: 1 tarea, 2 barras en la línea temporal.
    const conteo = contarTramites([
      tramite(1, "accion_usuario"),
      tramite(2, "oficio_administracion"),
    ]);
    expect(conteo.accionables).toHaveLength(1);
    expect(conteo.enCalendario).toHaveLength(2);
  });

  it("no incluye informativos ni revisiones en el calendario", () => {
    const conteo = contarTramites([tramite(1, "informativa"), tramite(2, "revision_manual")]);
    expect(conteo.enCalendario).toHaveLength(0);
  });

  it("aguanta un plan vacío", () => {
    const conteo = contarTramites([]);
    expect(conteo.accionables).toHaveLength(0);
    expect(conteo.enCalendario).toHaveLength(0);
  });
});

describe("textoPlazoTotal", () => {
  it("distingue 'no lo sabemos' de 'cero días'", () => {
    expect(textoPlazoTotal(null)).toEqual({ valor: "—", etiqueta: "sin estimación de plazo" });
    expect(textoPlazoTotal(undefined)).toEqual({ valor: "—", etiqueta: "sin estimación de plazo" });
  });

  it("muestra el plazo cuando lo hay", () => {
    expect(textoPlazoTotal(45)).toEqual({ valor: "~45", etiqueta: "días estimados" });
  });

  it("un cero real se muestra como cero, no como desconocido", () => {
    // El backend ya solo devuelve 0 si de verdad suma 0; la ausencia es null.
    expect(textoPlazoTotal(0)).toEqual({ valor: "~0", etiqueta: "días estimados" });
  });
});
