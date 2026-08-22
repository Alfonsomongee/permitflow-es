import { describe, expect, it } from "vitest";

import { alertasParaDigest, construirHtmlDigest } from "./digestNormativo";
import type { DbAlertaBoe } from "./supabase";
import type { ExpedienteMatch } from "./alertas";

function alerta(overrides: Partial<DbAlertaBoe> = {}): DbAlertaBoe {
  return {
    id: "a1",
    org_id: null,
    tipo: "normativa_nueva",
    titulo: "Cambio normativo",
    resumen: "Resumen del cambio",
    fuente_url: null,
    ccaa_afectadas: null,
    verticales_afectados: null,
    leida: false,
    creado_en: "2026-08-15T00:00:00Z",
    nivel_urgencia: "media",
    aplicada: false,
    aplicada_en: null,
    ...overrides,
  };
}

function expediente(overrides: Partial<ExpedienteMatch> = {}): ExpedienteMatch {
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

const DESDE = "2026-08-14T00:00:00Z";

describe("alertasParaDigest", () => {
  it("excluye alertas anteriores a la fecha de corte", () => {
    const vieja = alerta({ id: "vieja", creado_en: "2026-08-01T00:00:00Z" });
    const nueva = alerta({ id: "nueva", creado_en: "2026-08-15T00:00:00Z" });
    const resultado = alertasParaDigest([vieja, nueva], [expediente()], DESDE);
    expect(resultado.map((a) => a.id)).toEqual(["nueva"]);
  });

  it("excluye alertas no relevantes para la cartera", () => {
    const relevante = alerta({ id: "rel", ccaa_afectadas: ["andalucia"] });
    const noRelevante = alerta({ id: "no-rel", ccaa_afectadas: ["canarias"] });
    const resultado = alertasParaDigest(
      [relevante, noRelevante],
      [expediente({ comunidad: "andalucia" })],
      DESDE
    );
    expect(resultado.map((a) => a.id)).toEqual(["rel"]);
  });

  it("devuelve vacío si no hay alertas nuevas relevantes", () => {
    const resultado = alertasParaDigest(
      [alerta({ creado_en: "2026-08-01T00:00:00Z" })],
      [expediente()],
      DESDE
    );
    expect(resultado).toHaveLength(0);
  });
});

describe("construirHtmlDigest", () => {
  it("incluye el título y el resumen de cada alerta", () => {
    const html = construirHtmlDigest(
      [alerta({ titulo: "RD nuevo de autoconsumo", resumen: "Cambia el plazo de registro" })],
      "Instaladora Ejemplo"
    );
    expect(html).toContain("RD nuevo de autoconsumo");
    expect(html).toContain("Cambia el plazo de registro");
    expect(html).toContain("Instaladora Ejemplo");
  });

  it("escapa HTML del contenido de la alerta", () => {
    const html = construirHtmlDigest(
      [alerta({ titulo: "<script>alert(1)</script>" })],
      "Org"
    );
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("pluraliza correctamente para una sola alerta", () => {
    const html = construirHtmlDigest([alerta()], "Org");
    expect(html).toContain("1 cambio que afecta");
  });

  it("pluraliza correctamente para varias alertas", () => {
    const html = construirHtmlDigest([alerta({ id: "a" }), alerta({ id: "b" })], "Org");
    expect(html).toContain("2 cambios que afectan");
  });
});
