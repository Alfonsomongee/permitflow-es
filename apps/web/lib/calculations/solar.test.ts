import { describe, expect, it } from "vitest";
import { calculateSolarSimulation } from "./solar";
import { BENCHMARKS_FV } from "@/content/benchmarks_fv";

describe("calculateSolarSimulation", () => {
  it("calcula usando únicamente la potencia solicitada", () => {
    const result = calculateSolarSimulation({
      specificProductionKwhPerKwpYear: 1600,
      requestedPowerKwp: 4,
      sector: "residencial",
    });

    expect(result).not.toBeNull();
    expect(result?.effectivePowerKwp).toBe(4);
    expect(result?.adjustedBySurface).toBe(false);
  });

  it("limita la potencia cuando no cabe en la superficie", () => {
    const minM2 = BENCHMARKS_FV.m2_por_kwp.min;
    const surfaceM2 = 20;
    const maxKwp = surfaceM2 / minM2;
    
    const result = calculateSolarSimulation({
      specificProductionKwhPerKwpYear: 1600,
      surfaceM2,
      requestedPowerKwp: 10, // 10 kWp requeriría más de 20 m2
      sector: "residencial",
    });

    expect(result).not.toBeNull();
    expect(result?.adjustedBySurface).toBe(true);
    expect(result?.effectivePowerKwp).toBe(maxKwp);
    expect(result?.maximumPowerBySurfaceKwp).toBe(maxKwp);
  });

  it("calcula correctamente con superficie y potencia que sí encajan", () => {
    const minM2 = BENCHMARKS_FV.m2_por_kwp.min;
    const surfaceM2 = 100;
    const requestedPowerKwp = 3; // Cabe perfectamente
    
    const result = calculateSolarSimulation({
      specificProductionKwhPerKwpYear: 1600,
      surfaceM2,
      requestedPowerKwp,
      sector: "residencial",
    });

    expect(result).not.toBeNull();
    expect(result?.adjustedBySurface).toBe(false);
    expect(result?.effectivePowerKwp).toBe(requestedPowerKwp);
    expect(result?.maximumPowerBySurfaceKwp).toBe(100 / minM2);
  });

  it("estima una potencia conservadora usando solo superficie", () => {
    const result = calculateSolarSimulation({
      specificProductionKwhPerKwpYear: 1600,
      surfaceM2: 30,
      sector: "residencial",
    });

    expect(result).not.toBeNull();
    expect(result!.effectivePowerKwp).toBeGreaterThan(0);
    // Debe usar el max m2 para ser conservador
    expect(result!.effectivePowerKwp).toBe(30 / BENCHMARKS_FV.m2_por_kwp.max);
  });

  it("rechaza entradas sin superficie ni potencia", () => {
    const result = calculateSolarSimulation({
      specificProductionKwhPerKwpYear: 1600,
      sector: "residencial",
    });
    expect(result).toBeNull();
  });

  it("rechaza producción igual a cero o menor", () => {
    const result1 = calculateSolarSimulation({
      specificProductionKwhPerKwpYear: 0,
      requestedPowerKwp: 4,
      sector: "residencial",
    });
    expect(result1).toBeNull();

    const result2 = calculateSolarSimulation({
      specificProductionKwhPerKwpYear: -100,
      requestedPowerKwp: 4,
      sector: "residencial",
    });
    expect(result2).toBeNull();
  });

  it("rechaza entradas con valores absurdos (NaN, Infinity)", () => {
    expect(calculateSolarSimulation({
      specificProductionKwhPerKwpYear: 1600,
      requestedPowerKwp: Infinity,
      sector: "residencial",
    })).toBeNull();

    expect(calculateSolarSimulation({
      specificProductionKwhPerKwpYear: 1600,
      surfaceM2: NaN,
      sector: "residencial",
    })).toBeNull();
  });

  it("superficie menor que la mínima operativa no da fallo, pero la potencia se ajusta", () => {
    const result = calculateSolarSimulation({
      specificProductionKwhPerKwpYear: 1600,
      surfaceM2: 1, // 1 m2 (casi nada)
      requestedPowerKwp: 5,
      sector: "residencial",
    });
    
    expect(result).not.toBeNull();
    expect(result!.adjustedBySurface).toBe(true);
    expect(result!.effectivePowerKwp).toBe(1 / BENCHMARKS_FV.m2_por_kwp.min);
  });

  it("garantiza que min <= max en rangos y sin NaN ni Infinity", () => {
    const result = calculateSolarSimulation({
      specificProductionKwhPerKwpYear: 1600,
      requestedPowerKwp: 5,
      sector: "industrial_cubierta",
    });

    expect(result).not.toBeNull();
    
    const values = [
      result!.effectivePowerKwp,
      result!.annualProductionKwh.min,
      result!.annualProductionKwh.max,
      result!.annualSavingsEur.min,
      result!.annualSavingsEur.max,
      result!.investmentEur.min,
      result!.investmentEur.max,
      result!.paybackYears.min,
      result!.paybackYears.max,
    ];

    expect(values.every(Number.isFinite)).toBe(true);
    
    // Invariantes min <= max
    expect(result!.annualProductionKwh.min).toBeLessThanOrEqual(result!.annualProductionKwh.max);
    expect(result!.annualSavingsEur.min).toBeLessThanOrEqual(result!.annualSavingsEur.max);
    expect(result!.investmentEur.min).toBeLessThanOrEqual(result!.investmentEur.max);
    expect(result!.paybackYears.min).toBeLessThanOrEqual(result!.paybackYears.max);
  });
});
