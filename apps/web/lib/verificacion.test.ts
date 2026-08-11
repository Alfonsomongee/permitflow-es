import { describe, expect, it } from "vitest";

import { severidadDeVerificacion } from "./verificacion";
import { COBERTURA_NORMATIVA } from "@/content/cobertura_normativa";
import { nivelCobertura } from "@/components/nueva-instalacion/types";
import { severidadVerificacion, type PlanTramitacion } from "@/types/plan";

/**
 * Auditoría QA 2026-08-11, hallazgo A-01: el aviso previo del selector y el
 * banner del plan implementaban el mismo criterio con el orden de los
 * condicionales invertido, y se contradecían en 9 de las 85 combinaciones.
 */

describe("severidadDeVerificacion", () => {
  it("marca como crítico un borrador sin verificar", () => {
    expect(severidadDeVerificacion("generica", "borrador_no_verificado")).toEqual({
      nivel: "critico",
      etiqueta: "Borrador no verificado",
    });
  });

  it("marca como crítica la normativa genérica sin anotación de auditoría", () => {
    expect(severidadDeVerificacion("generica", null).nivel).toBe("critico");
  });

  it("deja que estado atenúe, no solo agrave", () => {
    // Este es el caso exacto de Aragón y Asturias: el fichero declara nivel
    // "generica", pero la auditoría de contenido anotó que se verificó
    // parcialmente. Antes salía "crítico" en el plan y "atención" en el paso 1.
    expect(severidadDeVerificacion("generica", "verificado_parcialmente")).toEqual({
      nivel: "atencion",
      etiqueta: "Verificado con observaciones",
    });
  });

  it("reconoce las observaciones anotadas en estado", () => {
    expect(
      severidadDeVerificacion("verificada_parcialmente", "verificado_con_observaciones").nivel
    ).toBe("atencion");
  });

  it("no marca nada cuando está verificada sin reservas", () => {
    expect(severidadDeVerificacion("verificada", null)).toEqual({
      nivel: "ninguno",
      etiqueta: "Verificado",
    });
  });

  it("trata como crítico un nivel desconocido sin anotación", () => {
    expect(severidadDeVerificacion(undefined, undefined).nivel).toBe("ninguno");
    expect(severidadDeVerificacion("generica", undefined).nivel).toBe("critico");
  });
});

describe("coherencia entre el aviso previo y el banner del plan", () => {
  const equivalencia = { verificada: "ninguno", atencion: "atencion", generica_grave: "critico" } as const;

  const combinaciones = Object.entries(COBERTURA_NORMATIVA).flatMap(([comunidad, verticales]) =>
    Object.entries(verticales).map(([vertical, combo]) => ({ comunidad, vertical, combo }))
  );

  it("cubre las 85 combinaciones reales del motor", () => {
    expect(combinaciones).toHaveLength(85);
  });

  it.each(combinaciones)(
    "$comunidad/$vertical dice lo mismo antes y después de clasificar",
    ({ comunidad, vertical, combo }) => {
      const antes = nivelCobertura(vertical, comunidad);

      const plan = {
        tramites: [],
        tiempo_total_estimado_dias: null,
        advertencias: [],
        nivel_verificacion: combo.nivelVerificacion as PlanTramitacion["nivel_verificacion"],
        estado: combo.estado,
      } satisfies PlanTramitacion;
      const despues = severidadVerificacion(plan);

      expect(equivalencia[antes]).toBe(despues.nivel);
    }
  );
});
