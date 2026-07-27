export type EconomicProjectionInput = {
  initialAnnualSavingsEur: number;
  years: number;
  annualProductionDegradationRate: number;
  annualEnergyPriceGrowthRate: number;
  annualMaintenanceEur: number;
};

export type EconomicProjectionYear = {
  year: number;
  grossSavingsEur: number;
  maintenanceEur: number;
  netSavingsEur: number;
  accumulatedSavingsEur: number;
};

function validateProjectionInput(input: EconomicProjectionInput): void {
  if (
    !Number.isFinite(input.initialAnnualSavingsEur) ||
    input.initialAnnualSavingsEur < 0
  ) {
    throw new RangeError(
      "initialAnnualSavingsEur must be a finite non-negative number",
    );
  }

  if (!Number.isInteger(input.years) || input.years < 1) {
    throw new RangeError("years must be a positive integer");
  }

  if (
    !Number.isFinite(input.annualProductionDegradationRate) ||
    input.annualProductionDegradationRate < 0 ||
    input.annualProductionDegradationRate >= 1
  ) {
    throw new RangeError(
      "annualProductionDegradationRate must be between 0 and 1",
    );
  }

  if (
    !Number.isFinite(input.annualEnergyPriceGrowthRate) ||
    input.annualEnergyPriceGrowthRate <= -1
  ) {
    throw new RangeError(
      "annualEnergyPriceGrowthRate must be greater than -1",
    );
  }

  if (
    !Number.isFinite(input.annualMaintenanceEur) ||
    input.annualMaintenanceEur < 0
  ) {
    throw new RangeError(
      "annualMaintenanceEur must be a finite non-negative number",
    );
  }
}

export function calculateSavingsProjection(
  input: EconomicProjectionInput,
): EconomicProjectionYear[] {
  validateProjectionInput(input);

  let accumulatedSavingsEur = 0;

  return Array.from({ length: input.years }, (_, index) => {
    const year = index + 1;

    const productionFactor = Math.pow(
      1 - input.annualProductionDegradationRate,
      index,
    );

    const energyPriceFactor = Math.pow(
      1 + input.annualEnergyPriceGrowthRate,
      index,
    );

    const grossSavingsEur =
      input.initialAnnualSavingsEur * productionFactor * energyPriceFactor;

    const maintenanceEur = input.annualMaintenanceEur;
    const netSavingsEur = grossSavingsEur - maintenanceEur;

    accumulatedSavingsEur += netSavingsEur;

    return {
      year,
      grossSavingsEur,
      maintenanceEur,
      netSavingsEur,
      accumulatedSavingsEur,
    };
  });
}

export function getProjectionAtYear(
  projection: EconomicProjectionYear[],
  year: number,
): EconomicProjectionYear | undefined {
  return projection.find((item) => item.year === year);
}
