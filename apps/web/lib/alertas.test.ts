import { describe, expect, it } from "vitest";

import {
  alertaAfectaExpediente,
  alertaRelevanteParaCartera,
  mapearAlertasAExpedientes,
  alertaEsPosteriorAExpediente,
  alertaImpactaRetroactivamente,
  expedientesConImpactoRetroactivo,
} from "./alertas";
import type { DbAlertaBoe, DbExpediente } from "./supabase";

function alerta(overrides: Partial<DbAlertaBoe> = {}): DbAlertaBoe {
  return {
    id: "a1",
    org_id: null,
    tipo: "normativa_nueva",
    titulo: "Cambio normativo",
    resumen: null,
    fuente_url: null,
    ccaa_afectadas: null,
    verticales_afectados: null,
    leida: false,
    creado_en: "2026-08-01T00:00:00Z",
    nivel_urgencia: "media",
    aplicada: false,
    aplicada_en: null,
    ...overrides,
  };
}

function expediente(overrides: Partial<DbExpediente> = {}): Pick<
  DbExpediente,
  "id" | "comunidad" | "tipo_instalacion" | "estado" | "referencia_cliente" | "creado_en"
> {
  return {
    id: "e1",
    comunidad: "andalucia",
    tipo_instalacion: "fotovoltaica_autoconsumo",
    estado: "pendiente",
    referencia_cliente: null,
    creado_en: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("alertaAfectaExpediente", () => {
  it("una alerta sin ccaa_afectadas ni verticales_afectados afecta a cualquier expediente", () => {
    expect(alertaAfectaExpediente(alerta(), expediente())).toBe(true);
  });

  it("filtra por CCAA cuando la alerta la especifica", () => {
    const a = alerta({ ccaa_afectadas: ["madrid"] });
    expect(alertaAfectaExpediente(a, expediente({ comunidad: "madrid" }))).toBe(true);
    expect(alertaAfectaExpediente(a, expediente({ comunidad: "andalucia" }))).toBe(false);
  });

  it("filtra por vertical cuando la alerta lo especifica", () => {
    const a = alerta({ verticales_afectados: ["irve"] });
    expect(alertaAfectaExpediente(a, expediente({ tipo_instalacion: "irve" }))).toBe(true);
    expect(
      alertaAfectaExpediente(a, expediente({ tipo_instalacion: "fotovoltaica_autoconsumo" }))
    ).toBe(false);
  });

  it("exige que coincidan ambos filtros cuando la alerta especifica los dos", () => {
    const a = alerta({ ccaa_afectadas: ["madrid"], verticales_afectados: ["irve"] });
    expect(
      alertaAfectaExpediente(a, expediente({ comunidad: "madrid", tipo_instalacion: "irve" }))
    ).toBe(true);
    expect(
      alertaAfectaExpediente(
        a,
        expediente({ comunidad: "madrid", tipo_instalacion: "fotovoltaica_autoconsumo" })
      )
    ).toBe(false);
  });
});

describe("mapearAlertasAExpedientes", () => {
  it("solo incluye expedientes en estados activos", () => {
    const a = alerta();
    const activo = expediente({ id: "e1", estado: "pendiente" });
    const aprobado = expediente({ id: "e2", estado: "aprobado" });
    const mapa = mapearAlertasAExpedientes([a], [activo, aprobado]);
    expect(mapa[a.id].map((e) => e.id)).toEqual(["e1"]);
  });

  it("usa referencia_cliente como etiqueta si existe, si no el tipo de instalación", () => {
    const a = alerta();
    const conCliente = expediente({ id: "e1", referencia_cliente: "Cliente X" });
    const sinCliente = expediente({ id: "e2", referencia_cliente: null });
    const mapa = mapearAlertasAExpedientes([a], [conCliente, sinCliente]);
    const etiquetas = mapa[a.id].map((e) => e.etiqueta);
    expect(etiquetas).toContain("Cliente X");
    expect(etiquetas).toContain("fotovoltaica_autoconsumo");
  });
});

describe("alertaRelevanteParaCartera", () => {
  it("sin cartera (cero expedientes), toda alerta se considera relevante", () => {
    expect(alertaRelevanteParaCartera(alerta({ ccaa_afectadas: ["canarias"] }), [])).toBe(true);
  });

  it("es relevante si al menos un expediente de la cartera coincide", () => {
    const a = alerta({ ccaa_afectadas: ["madrid"] });
    const cartera = [
      expediente({ id: "e1", comunidad: "andalucia" }),
      expediente({ id: "e2", comunidad: "madrid" }),
    ];
    expect(alertaRelevanteParaCartera(a, cartera)).toBe(true);
  });

  it("no es relevante si ningún expediente de la cartera coincide", () => {
    const a = alerta({ ccaa_afectadas: ["canarias"] });
    const cartera = [
      expediente({ id: "e1", comunidad: "andalucia" }),
      expediente({ id: "e2", comunidad: "madrid" }),
    ];
    expect(alertaRelevanteParaCartera(a, cartera)).toBe(false);
  });

  it("cuenta expedientes ya aprobados/rechazados como parte de la cartera", () => {
    // A diferencia de mapearAlertasAExpedientes (solo activos), la relevancia
    // de cartera usa todo el histórico: un expediente aprobado sigue
    // indicando que la organización trabaja esa CCAA/vertical.
    const a = alerta({ ccaa_afectadas: ["madrid"] });
    const cartera = [expediente({ id: "e1", comunidad: "madrid", estado: "aprobado" })];
    expect(alertaRelevanteParaCartera(a, cartera)).toBe(true);
  });
});

describe("alertaEsPosteriorAExpediente", () => {
  it("false si la alerta no está aplicada (sugerencia de IA sin revisar)", () => {
    const a = alerta({ aplicada: false, aplicada_en: "2026-06-01T00:00:00Z" });
    const e = expediente({ creado_en: "2026-01-01T00:00:00Z" });
    expect(alertaEsPosteriorAExpediente(a, e)).toBe(false);
  });

  it("false si aplicada pero sin fecha de aplicación", () => {
    const a = alerta({ aplicada: true, aplicada_en: null });
    const e = expediente({ creado_en: "2026-01-01T00:00:00Z" });
    expect(alertaEsPosteriorAExpediente(a, e)).toBe(false);
  });

  it("false si se aplicó ANTES de crear el expediente (ya vigente al crearlo)", () => {
    const a = alerta({ aplicada: true, aplicada_en: "2026-01-01T00:00:00Z" });
    const e = expediente({ creado_en: "2026-06-01T00:00:00Z" });
    expect(alertaEsPosteriorAExpediente(a, e)).toBe(false);
  });

  it("true si se aplicó DESPUÉS de crear el expediente", () => {
    const a = alerta({ aplicada: true, aplicada_en: "2026-06-01T00:00:00Z" });
    const e = expediente({ creado_en: "2026-01-01T00:00:00Z" });
    expect(alertaEsPosteriorAExpediente(a, e)).toBe(true);
  });
});

describe("alertaImpactaRetroactivamente", () => {
  it("false si es posterior pero no afecta a la CCAA/vertical del expediente", () => {
    const a = alerta({
      aplicada: true,
      aplicada_en: "2026-06-01T00:00:00Z",
      ccaa_afectadas: ["canarias"],
    });
    const e = expediente({ comunidad: "andalucia", creado_en: "2026-01-01T00:00:00Z" });
    expect(alertaImpactaRetroactivamente(a, e)).toBe(false);
  });

  it("false si afecta pero es una sugerencia de IA sin verificar", () => {
    const a = alerta({ aplicada: false, aplicada_en: "2026-06-01T00:00:00Z" });
    const e = expediente({ creado_en: "2026-01-01T00:00:00Z" });
    expect(alertaImpactaRetroactivamente(a, e)).toBe(false);
  });

  it("true solo cuando afecta, está verificada y es posterior a la creación", () => {
    const a = alerta({
      aplicada: true,
      aplicada_en: "2026-06-01T00:00:00Z",
      ccaa_afectadas: ["andalucia"],
    });
    const e = expediente({ comunidad: "andalucia", creado_en: "2026-01-01T00:00:00Z" });
    expect(alertaImpactaRetroactivamente(a, e)).toBe(true);
  });
});

describe("expedientesConImpactoRetroactivo", () => {
  it("solo incluye expedientes activos", () => {
    const a = alerta({ aplicada: true, aplicada_en: "2026-06-01T00:00:00Z" });
    const activo = expediente({ id: "e1", estado: "pendiente", creado_en: "2026-01-01T00:00:00Z" });
    const aprobado = expediente({ id: "e2", estado: "aprobado", creado_en: "2026-01-01T00:00:00Z" });
    const resultado = expedientesConImpactoRetroactivo([a], [activo, aprobado]);
    expect(resultado.map((r) => r.expediente.id)).toEqual(["e1"]);
  });

  it("agrupa todas las alertas retroactivas del mismo expediente juntas", () => {
    const a1 = alerta({ id: "a1", aplicada: true, aplicada_en: "2026-06-01T00:00:00Z" });
    const a2 = alerta({ id: "a2", aplicada: true, aplicada_en: "2026-07-01T00:00:00Z" });
    const e = expediente({ id: "e1", creado_en: "2026-01-01T00:00:00Z" });
    const resultado = expedientesConImpactoRetroactivo([a1, a2], [e]);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].alertas.map((a) => a.id).sort()).toEqual(["a1", "a2"]);
  });

  it("no incluye expedientes sin ninguna alerta retroactiva", () => {
    const a = alerta({ aplicada: false }); // sugerencia sin verificar
    const e = expediente({ creado_en: "2026-01-01T00:00:00Z" });
    expect(expedientesConImpactoRetroactivo([a], [e])).toHaveLength(0);
  });
});
