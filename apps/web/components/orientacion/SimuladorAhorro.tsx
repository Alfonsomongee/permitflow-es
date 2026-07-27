"use client";

import { useState } from "react";
import { AlertCircle, Calculator, Info } from "lucide-react";
import { BENCHMARKS_FV } from "@/content/benchmarks_fv";
import type { IdoneidadResult } from "./IndiceIdoneidad";
import { calculateSolarSimulation, type SolarSector } from "@/lib/calculations/solar";
import { parsePositiveNumber } from "@/lib/parsing/numbers";

type Props = {
  result: IdoneidadResult;
};

export function SimuladorAhorro({ result }: Props) {
  const [superficie, setSuperficie] = useState<string>("");
  const [potencia, setPotencia] = useState<string>("");
  const [sector, setSector] = useState<SolarSector>("residencial");

  const produccionEspecifica =
    result.idoneidad.fotovoltaica_autoconsumo?.produccion_especifica_kwh_kwp_year;

  if (
    produccionEspecifica == null ||
    !Number.isFinite(produccionEspecifica) ||
    produccionEspecifica <= 0
  ) {
    return null;
  }

  const simulation = calculateSolarSimulation({
    specificProductionKwhPerKwpYear: produccionEspecifica,
    surfaceM2: parsePositiveNumber(superficie),
    requestedPowerKwp: parsePositiveNumber(potencia),
    sector,
  });

  const isValid = simulation !== null;

  return (
    <div className="mt-8 rounded-xl border border-border bg-surface overflow-hidden">
      <div className="border-b border-border bg-bg px-5 py-4">
        <h2 className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <Calculator size={16} className="text-primary" />
          Simulador paramétrico de ahorro
        </h2>
        <p className="mt-1 text-xs text-text-secondary">
          Estima el coste, producción y retorno de inversión basándote en parámetros conservadores del mercado. 
          Los excedentes vertidos a red no se consideran para no inflar expectativas.
        </p>
      </div>

      <div className="p-5">
        <div className="mb-6 grid gap-4 sm:grid-cols-3 items-start">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-primary">Sector</label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value as SolarSector)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="residencial">Residencial</option>
              <option value="industrial_cubierta">Industrial (cubierta)</option>
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-primary">Superficie disponible (m²)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={superficie}
              onChange={(e) => setSuperficie(e.target.value)}
              placeholder="Ej: 30"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-primary">Potencia deseada (kWp)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={potencia}
              onChange={(e) => setPotencia(e.target.value)}
              placeholder="Ej: 3.5"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {simulation?.adjustedBySurface && (
          <div className="mb-6 flex items-start gap-2.5 rounded-lg bg-warning/10 p-3 text-sm text-warning">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <p>
              La potencia deseada <strong>no cabe</strong> en la superficie indicada 
              (mínimo {BENCHMARKS_FV.m2_por_kwp.min} m²/kWp). El cálculo se ha ajustado a la potencia máxima posible: 
              <strong> {simulation.effectivePowerKwp.toFixed(2)} kWp</strong>.
            </p>
          </div>
        )}

        {isValid && simulation ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border bg-bg p-4">
                <p className="text-xs text-text-secondary">Producción Anual</p>
                <p className="mt-1 text-lg font-semibold text-text-primary">
                  {Math.round(simulation.annualProductionKwh.min).toLocaleString("es-ES")} - {Math.round(simulation.annualProductionKwh.max).toLocaleString("es-ES")} <span className="text-sm font-normal text-text-secondary">kWh</span>
                </p>
              </div>
              <div className="rounded-lg border border-border bg-bg p-4">
                <p className="text-xs text-text-secondary">Ahorro Estimado (1er año)</p>
                <p className="mt-1 text-lg font-semibold text-success">
                  {Math.round(simulation.annualSavingsEur.min).toLocaleString("es-ES")}€ - {Math.round(simulation.annualSavingsEur.max).toLocaleString("es-ES")}€
                </p>
              </div>
              <div className="rounded-lg border border-border bg-bg p-4">
                <p className="text-xs text-text-secondary">Inversión Llave en Mano</p>
                <p className="mt-1 text-lg font-semibold text-text-primary">
                  {Math.round(simulation.investmentEur.min).toLocaleString("es-ES")}€ - {Math.round(simulation.investmentEur.max).toLocaleString("es-ES")}€
                </p>
              </div>
              <div className="rounded-lg border border-border bg-bg p-4">
                <p className="text-xs text-text-secondary">Periodo de Amortización</p>
                <p className="mt-1 text-lg font-semibold text-text-primary">
                  {simulation.paybackYears.min.toFixed(1)} - {simulation.paybackYears.max.toFixed(1)} <span className="text-sm font-normal text-text-secondary">años</span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-text-secondary">
              <Info size={14} className="mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p>Las cifras son <strong>orientativas</strong> y se calculan mediante parámetros estadísticos del mercado:</p>
                <ul className="list-disc pl-4 opacity-80">
                  <li>Precio de la energía: {BENCHMARKS_FV.precio_kwh_defecto.valor} €/kWh (Impuestos incluidos. No incluye término de potencia).</li>
                  <li>Coste de instalación llave en mano estimado ({sector}): {BENCHMARKS_FV.coste_eur_por_kwp[sector].min} - {BENCHMARKS_FV.coste_eur_por_kwp[sector].max} €/kWp.</li>
                  {!BENCHMARKS_FV.coste_eur_por_kwp[sector].verificada && (
                     <li className="text-warning">Atención: Algunos benchmarks (ej. coste por kWp) utilizan estimaciones de mercado que aún no han sido verificadas con fuentes oficiales.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-text-secondary">
            Introduce la superficie disponible o la potencia deseada para generar la simulación.
          </div>
        )}
      </div>
    </div>
  );
}
