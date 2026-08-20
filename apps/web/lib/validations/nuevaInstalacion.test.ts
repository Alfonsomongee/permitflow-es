import { describe, expect, it } from "vitest";
import { nuevaInstalacionSchema } from "./nuevaInstalacion";
import { FORM_INITIAL } from "@/components/nueva-instalacion/types";

/**
 * Auditoría motor normativo 2026-08-19 (P0-4 / P0-5): modo_recarga y
 * ubicacion_irve se preguntaban en la UI (campoAplica) pero no se exigía
 * respuesta -- el usuario podía avanzar sin tocarlos y el payload los omitía,
 * llegando como null al backend. Estos tests fijan que el formulario ya no
 * lo permite.
 */

function base(overrides: Partial<typeof FORM_INITIAL> = {}) {
  return { ...FORM_INITIAL, ...overrides };
}

describe("nuevaInstalacionSchema — IRVE: modo_recarga y ubicacion_irve obligatorios", () => {
  it("rechaza IRVE sin modo_recarga", () => {
    const datos = base({
      tipo_instalacion: "irve",
      potencia_kw: "11",
      modo_recarga: "",
      ubicacion_irve: "exterior",
    });
    const resultado = nuevaInstalacionSchema.safeParse(datos);
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues.some((i) => i.path.includes("modo_recarga"))).toBe(true);
    }
  });

  it("rechaza IRVE sin ubicacion_irve", () => {
    const datos = base({
      tipo_instalacion: "irve",
      potencia_kw: "11",
      modo_recarga: "3",
      ubicacion_irve: "",
    });
    const resultado = nuevaInstalacionSchema.safeParse(datos);
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues.some((i) => i.path.includes("ubicacion_irve"))).toBe(true);
    }
  });

  it("acepta IRVE con ambos campos informados", () => {
    const datos = base({
      tipo_instalacion: "irve",
      potencia_kw: "11",
      modo_recarga: "3",
      ubicacion_irve: "exterior",
    });
    const resultado = nuevaInstalacionSchema.safeParse(datos);
    expect(resultado.success).toBe(true);
  });

  it("no exige modo_recarga/ubicacion_irve fuera de IRVE", () => {
    const datos = base({
      tipo_instalacion: "fotovoltaica_autoconsumo",
      potencia_kw: "5",
      modo_recarga: "",
      ubicacion_irve: "",
      tension: "BT",
    });
    const resultado = nuevaInstalacionSchema.safeParse(datos);
    expect(resultado.success).toBe(true);
  });
});

describe("nuevaInstalacionSchema — ACS: tipo_generador_acs sigue siendo opcional", () => {
  // A diferencia de IRVE, omitir tipo_generador_acs nunca hace que la
  // instalación reciba una exención que no le corresponde (el backend ya
  // trata "sin dato" igual que el itinerario más gravoso). No se bloquea en
  // el formulario -- ver motor_normativo/clasificador.py, aviso equivalente
  // en el backend.
  it("acepta ACS sin tipo_generador_acs", () => {
    const datos = base({
      tipo_instalacion: "acs",
      potencia_kw: "60",
      tipo_generador_acs: "",
    });
    const resultado = nuevaInstalacionSchema.safeParse(datos);
    expect(resultado.success).toBe(true);
  });
});
