import { BENCHMARKS_FV } from "@/content/benchmarks_fv";

export type SolarSector = "residencial" | "industrial_cubierta";

export type NumericRange = {
  min: number;
  max: number;
};

export type SolarSimulationInput = {
  specificProductionKwhPerKwpYear: number;
  surfaceM2?: number;
  requestedPowerKwp?: number;
  sector: SolarSector;
};

export type SolarSimulationResult = {
  effectivePowerKwp: number;
  maximumPowerBySurfaceKwp?: number;
  adjustedBySurface: boolean;
  annualProductionKwh: NumericRange;
  annualSavingsEur: NumericRange;
  investmentEur: NumericRange;
  paybackYears: NumericRange;
};

function isPositiveFinite(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0;
}

export function calculateSolarSimulation(
  input: SolarSimulationInput,
): SolarSimulationResult | null {
  const {
    specificProductionKwhPerKwpYear,
    surfaceM2,
    requestedPowerKwp,
    sector,
  } = input;

  if (!isPositiveFinite(specificProductionKwhPerKwpYear)) {
    return null;
  }

  const hasSurface = isPositiveFinite(surfaceM2);
  const hasRequestedPower = isPositiveFinite(requestedPowerKwp);

  if (!hasSurface && !hasRequestedPower) {
    return null;
  }

  const maximumPowerBySurfaceKwp = hasSurface
    ? surfaceM2 / BENCHMARKS_FV.m2_por_kwp.min
    : undefined;

  let effectivePowerKwp: number;

  if (hasRequestedPower && maximumPowerBySurfaceKwp !== undefined) {
    effectivePowerKwp = Math.min(requestedPowerKwp, maximumPowerBySurfaceKwp);
  } else if (hasRequestedPower) {
    effectivePowerKwp = requestedPowerKwp;
  } else {
    // Si no hay potencia solicitada, estimamos una intermedia-conservadora
    effectivePowerKwp = surfaceM2! / BENCHMARKS_FV.m2_por_kwp.max;
  }

  const adjustedBySurface =
    hasRequestedPower &&
    maximumPowerBySurfaceKwp !== undefined &&
    requestedPowerKwp > maximumPowerBySurfaceKwp;

  const annualProductionKwh = {
    min: effectivePowerKwp * specificProductionKwhPerKwpYear * 0.95, // 5% de pérdidas conservadoras extra
    max: effectivePowerKwp * specificProductionKwhPerKwpYear,
  };

  const selfConsumption = BENCHMARKS_FV.ratio_autoconsumo_sin_bateria;
  const energyPrice = BENCHMARKS_FV.precio_kwh_defecto.valor;

  const annualSavingsEur = {
    min: annualProductionKwh.min * selfConsumption.min * energyPrice,
    max: annualProductionKwh.max * selfConsumption.max * energyPrice,
  };

  const installationCost = BENCHMARKS_FV.coste_eur_por_kwp[sector];

  // Inversión (€) = Potencia * Coste_kWp
  const investmentEur = {
    min: effectivePowerKwp * installationCost.min,
    max: effectivePowerKwp * installationCost.max,
  };

  // Si el ahorro es nulo o si las métricas están corruptas (e.g. coste max < coste min)
  if (
    annualSavingsEur.min <= 0 ||
    annualSavingsEur.max <= 0 ||
    installationCost.min > installationCost.max ||
    selfConsumption.min < 0 ||
    selfConsumption.max > 1 ||
    energyPrice <= 0
  ) {
    return null;
  }

  const paybackMin = investmentEur.min / annualSavingsEur.max;
  const paybackMax = investmentEur.max / annualSavingsEur.min;

  if (!Number.isFinite(paybackMin) || !Number.isFinite(paybackMax) || paybackMin <= 0) {
    return null;
  }

  return {
    effectivePowerKwp,
    maximumPowerBySurfaceKwp,
    adjustedBySurface,
    annualProductionKwh,
    annualSavingsEur,
    investmentEur,
    paybackYears: {
      min: paybackMin,
      max: paybackMax,
    },
  };
}
