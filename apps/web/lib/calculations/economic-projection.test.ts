import { describe, expect, it } from "vitest";
import { calculateSavingsProjection, getProjectionAtYear, type EconomicProjectionInput } from "./economic-projection";

const baseInput: EconomicProjectionInput = {
  initialAnnualSavingsEur: 1000,
  years: 25,
  annualProductionDegradationRate: 0.005, // 0.5%
  annualEnergyPriceGrowthRate: 0.02, // 2%
  annualMaintenanceEur: 100,
};

describe("calculateSavingsProjection", () => {
  it("calcula el año 1 sin aplicar degradación ni inflación", () => {
    const projection = calculateSavingsProjection({
      ...baseInput,
      annualProductionDegradationRate: 0.1, // irrelevante para el año 1
      annualEnergyPriceGrowthRate: 0.1, // irrelevante para el año 1
    });

    const year1 = projection[0];
    expect(year1.year).toBe(1);
    expect(year1.grossSavingsEur).toBe(1000);
    expect(year1.maintenanceEur).toBe(100);
    expect(year1.netSavingsEur).toBe(900);
    expect(year1.accumulatedSavingsEur).toBe(900);
  });

  it("calcula correctamente sin degradación ni inflación ni mantenimiento", () => {
    const projection = calculateSavingsProjection({
      initialAnnualSavingsEur: 1000,
      years: 10,
      annualProductionDegradationRate: 0,
      annualEnergyPriceGrowthRate: 0,
      annualMaintenanceEur: 0,
    });

    expect(projection.length).toBe(10);
    expect(projection[9].accumulatedSavingsEur).toBe(10000); // 1000 * 10
  });

  it("combina degradación e inflación correctamente en años posteriores", () => {
    const projection = calculateSavingsProjection(baseInput);

    const year2 = projection[1];
    
    // Año 2: 1000 * (1 - 0.005)^1 * (1 + 0.02)^1 = 1000 * 0.995 * 1.02 = 1014.9
    expect(year2.grossSavingsEur).toBeCloseTo(1014.9, 2);
    expect(year2.netSavingsEur).toBeCloseTo(914.9, 2);
    expect(year2.accumulatedSavingsEur).toBeCloseTo(900 + 914.9, 2);
  });

  it("maneja inflación negativa de forma válida", () => {
    const projection = calculateSavingsProjection({
      ...baseInput,
      annualEnergyPriceGrowthRate: -0.05, // La energía baja 5% cada año
      years: 3,
    });

    const year2 = projection[1];
    expect(year2.grossSavingsEur).toBeLessThan(1000);
  });

  it("permite ahorro neto negativo", () => {
    const projection = calculateSavingsProjection({
      ...baseInput,
      initialAnnualSavingsEur: 50, // Ahorro inicial muy bajo
      annualMaintenanceEur: 100, // Mantenimiento superior al ahorro
    });

    const year1 = projection[0];
    expect(year1.netSavingsEur).toBe(-50);
    expect(year1.accumulatedSavingsEur).toBe(-50);
  });

  it("el total acumulado equivale a la suma manual anual", () => {
    const projection = calculateSavingsProjection(baseInput);
    
    let sum = 0;
    for (const item of projection) {
      sum += item.netSavingsEur;
      expect(item.accumulatedSavingsEur).toBeCloseTo(sum, 5);
    }
  });

  it("devuelve los hitos esperados de 5, 10 y 25 años", () => {
    const projection = calculateSavingsProjection(baseInput);

    const year5 = getProjectionAtYear(projection, 5);
    const year10 = getProjectionAtYear(projection, 10);
    const year25 = getProjectionAtYear(projection, 25);

    expect(year5?.year).toBe(5);
    expect(year10?.year).toBe(10);
    expect(year25?.year).toBe(25);
    
    // El acumulado siempre debe ir subiendo en este escenario (ahorro > mantenimiento)
    expect(year10!.accumulatedSavingsEur).toBeGreaterThan(year5!.accumulatedSavingsEur);
    expect(year25!.accumulatedSavingsEur).toBeGreaterThan(year10!.accumulatedSavingsEur);
  });

  it("rechaza entradas inválidas de ahorro inicial", () => {
    expect(() => calculateSavingsProjection({ ...baseInput, initialAnnualSavingsEur: -10 })).toThrow(RangeError);
    expect(() => calculateSavingsProjection({ ...baseInput, initialAnnualSavingsEur: NaN })).toThrow(RangeError);
  });

  it("rechaza entradas inválidas de años", () => {
    expect(() => calculateSavingsProjection({ ...baseInput, years: 0 })).toThrow(RangeError);
    expect(() => calculateSavingsProjection({ ...baseInput, years: 1.5 })).toThrow(RangeError); // no entero
  });

  it("rechaza tasas de degradación inválidas", () => {
    expect(() => calculateSavingsProjection({ ...baseInput, annualProductionDegradationRate: -0.1 })).toThrow(RangeError);
    expect(() => calculateSavingsProjection({ ...baseInput, annualProductionDegradationRate: 1.1 })).toThrow(RangeError);
  });

  it("rechaza inflación igual o inferior a -1", () => {
    expect(() => calculateSavingsProjection({ ...baseInput, annualEnergyPriceGrowthRate: -1 })).toThrow(RangeError);
    expect(() => calculateSavingsProjection({ ...baseInput, annualEnergyPriceGrowthRate: -2 })).toThrow(RangeError);
  });

  it("rechaza mantenimiento negativo", () => {
    expect(() => calculateSavingsProjection({ ...baseInput, annualMaintenanceEur: -50 })).toThrow(RangeError);
  });
});
