import { describe, expect, it } from "vitest";
import { COBERTURA_NORMATIVA } from "@/content/cobertura_normativa";
import { mesYAnio, resumenCobertura, verificadasEnComunidad } from "./cobertura-resumen";

describe("resumenCobertura", () => {
  it("clasifica las 85 combinaciones reales sin perder ninguna", () => {
    const r = resumenCobertura();
    expect(r.comunidades).toBe(17);
    expect(r.verticales).toBe(5);
    expect(r.combinaciones).toBe(85);
    expect(r.verificadas + r.parciales + r.enBorrador).toBe(r.combinaciones);
    expect(r.ultimaRevision).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("no presenta como verificado lo que no lo está (Andalucía: solo ACS)", () => {
    const { verificadas, total } = verificadasEnComunidad("andalucia");
    expect(total).toBe(5);
    expect(verificadas).toBeLessThan(total);
  });

  it("cuenta revisores humanos solo si el fichero los identifica", () => {
    const falsa = {
      x: {
        acs: { nivelVerificacion: "verificada", estado: null, huecos: 0, ultimaRevision: "2026-01-01", revisadoPor: "Ana" },
        irve: { nivelVerificacion: "generica", estado: null, huecos: 3, ultimaRevision: "2026-02-01", revisadoPor: null },
      },
    };
    const r = resumenCobertura(falsa);
    expect(r.conRevisorHumano).toBe(1);
    expect(r.verificadas).toBe(1);
    expect(r.enBorrador).toBe(1);
    expect(r.ultimaRevision).toBe("2026-02-01");
  });
});

describe("mesYAnio", () => {
  it("formatea en español", () => expect(mesYAnio("2026-08-09")).toBe("agosto de 2026"));
  it("tolera fechas ausentes o inválidas", () => {
    expect(mesYAnio(null)).toBe("sin fecha");
    expect(mesYAnio("nada")).toBe("sin fecha");
  });
});

it("la cobertura contiene las 17 comunidades", () => {
  expect(Object.keys(COBERTURA_NORMATIVA)).toHaveLength(17);
});
