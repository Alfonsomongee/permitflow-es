import { describe, expect, it } from "vitest";

import {
  detectarSilenciosVencidos,
  mensajeSilencio,
} from "./silencioAdministrativo";
import { hoyIso } from "./plazos";
import { calcularVencimientoHabil } from "./festivos";
import type { Tramite, TramitesEstadoMap } from "@/types/plan";

/**
 * Origen: hoja de ruta de producto 2026-08-21 (PREM-06). detectarSilenciosVencidos
 * reutiliza calcularPlazo (lib/plazos.ts) para el cómputo de vencimiento --
 * estos tests fijan una fecha_inicio bien en el pasado (2026-01-05, sin
 * festivos cerca) para no depender de la fecha real del día en que corre el
 * test ni acoplarse al calendario de un año concreto de forma frágil.
 */

const FECHA_INICIO_LEJANA = "2026-01-05"; // lunes, sin festivos cerca

function tramite(overrides: Partial<Tramite> = {}): Tramite {
  return {
    orden: 1,
    nombre: "Registro de instalación en PUES",
    organismo: "Delegación Territorial de Industria",
    base_legal: "RD 244/2019, art. 9",
    plazo_estimado_dias: 30,
    plazo_legal_dias: 30,
    documentos_requeridos: [],
    notas: null,
    plataforma: "PUES",
    plataforma_url: null,
    coste_estimado: null,
    silencio_administrativo: "positivo",
    ...overrides,
  };
}

function estadoEnCurso(fechaInicio: string): TramitesEstadoMap {
  return { "1": { estado: "en_curso", fecha_inicio: fechaInicio, fecha_completado: null } };
}

describe("detectarSilenciosVencidos", () => {
  it("no marca nada si silencio_administrativo no está informado", () => {
    const t = tramite({ silencio_administrativo: undefined });
    const resultado = detectarSilenciosVencidos(
      [t],
      estadoEnCurso(FECHA_INICIO_LEJANA),
      "andalucia"
    );
    expect(resultado).toHaveLength(0);
  });

  it("no marca nada si el trámite no tiene plazo_legal_dias", () => {
    const t = tramite({ plazo_legal_dias: null });
    const resultado = detectarSilenciosVencidos(
      [t],
      estadoEnCurso(FECHA_INICIO_LEJANA),
      "andalucia"
    );
    expect(resultado).toHaveLength(0);
  });

  it("no marca nada si el trámite no está en_curso", () => {
    const t = tramite();
    const estado: TramitesEstadoMap = {
      "1": { estado: "pendiente", fecha_inicio: null, fecha_completado: null },
    };
    const resultado = detectarSilenciosVencidos([t], estado, "andalucia");
    expect(resultado).toHaveLength(0);
  });

  it("no marca nada si el plazo todavía no ha vencido", () => {
    const t = tramite();
    const resultado = detectarSilenciosVencidos(
      [t],
      estadoEnCurso(hoyIso()),
      "andalucia"
    );
    expect(resultado).toHaveLength(0);
  });

  it("detecta un plazo vencido con silencio positivo", () => {
    const t = tramite({ silencio_administrativo: "positivo" });
    const resultado = detectarSilenciosVencidos(
      [t],
      estadoEnCurso(FECHA_INICIO_LEJANA),
      "andalucia"
    );
    expect(resultado).toHaveLength(1);
    expect(resultado[0].efecto).toBe("positivo");
    expect(resultado[0].orden).toBe(1);
    expect(resultado[0].diasVencido).toBeGreaterThan(0);

    const { fechaVencimiento } = calcularVencimientoHabil(
      FECHA_INICIO_LEJANA,
      30,
      "andalucia"
    );
    expect(resultado[0].fechaVencimiento).toBe(fechaVencimiento);
  });

  it("detecta un plazo vencido con silencio negativo", () => {
    const t = tramite({ silencio_administrativo: "negativo" });
    const resultado = detectarSilenciosVencidos(
      [t],
      estadoEnCurso(FECHA_INICIO_LEJANA),
      "andalucia"
    );
    expect(resultado[0].efecto).toBe("negativo");
  });

  it("solo incluye los trámites verificados cuando se mezclan varios", () => {
    const conSilencio = tramite({ orden: 1, silencio_administrativo: "positivo" });
    const sinVerificar = tramite({ orden: 2, silencio_administrativo: undefined });
    const estado: TramitesEstadoMap = {
      "1": { estado: "en_curso", fecha_inicio: FECHA_INICIO_LEJANA, fecha_completado: null },
      "2": { estado: "en_curso", fecha_inicio: FECHA_INICIO_LEJANA, fecha_completado: null },
    };
    const resultado = detectarSilenciosVencidos([conSilencio, sinVerificar], estado, "andalucia");
    expect(resultado).toHaveLength(1);
    expect(resultado[0].orden).toBe(1);
  });
});

describe("mensajeSilencio", () => {
  it("distingue el mensaje de positivo y negativo", () => {
    expect(mensajeSilencio("positivo")).toContain("ESTIMADA");
    expect(mensajeSilencio("negativo")).toContain("DESESTIMADA");
    expect(mensajeSilencio("positivo")).not.toBe(mensajeSilencio("negativo"));
  });
});
