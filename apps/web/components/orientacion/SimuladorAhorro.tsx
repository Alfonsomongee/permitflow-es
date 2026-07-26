"use client";

import { useState } from "react";
import { AlertCircle, Calculator, Info } from "lucide-react";
import { BENCHMARKS_FV } from "@/content/benchmarks_fv";
import type { IdoneidadResult } from "./IndiceIdoneidad";

type Props = {
  result: IdoneidadResult;
};

export function SimuladorAhorro({ result }: Props) {
  const [superficie, setSuperficie] = useState<string>("");
  const [potencia, setPotencia] = useState<string>("");
  const [sector, setSector] = useState<"residencial" | "industrial_cubierta">("residencial");

  const produccionEspecifica =
    result.idoneidad.fotovoltaica_autoconsumo.produccion_especifica_kwh_kwp_year;

  if (!produccionEspecifica) {
    return null;
  }

  // 1. Parsing y validación cruzada
  const supNum = parseFloat(superficie);
  const potNum = parseFloat(potencia);
  const m2PorKwpMin = BENCHMARKS_FV.m2_por_kwp.min;

  let potenciaCalculada = potNum;
  let showBannerSuperficie = false;

  if (!Number.isNaN(supNum) && supNum > 0) {
    const potMaxPorSuperficie = supNum / m2PorKwpMin;
    if (!Number.isNaN(potNum) && potNum > potMaxPorSuperficie) {
      potenciaCalculada = potMaxPorSuperficie;
      showBannerSuperficie = true;
    } else if (Number.isNaN(potNum)) {
      // Si solo introduce superficie, calculamos una potencia media-baja (usando max m2) para ser conservadores
      potenciaCalculada = supNum / BENCHMARKS_FV.m2_por_kwp.max;
    }
  }

  // 2. Simulaciones (solo si hay potencia válida)
  const isValid = !Number.isNaN(potenciaCalculada) && potenciaCalculada > 0;
  
  let produccionMin = 0;
  let produccionMax = 0;
  let ahorroMin = 0;
  let ahorroMax = 0;
  let inversionMin = 0;
  let inversionMax = 0;
  let amortizacionMin = 0;
  let amortizacionMax = 0;

  if (isValid) {
    // Producción anual (kWh) = Potencia (kWp) * E_y (kWh/kWp)
    produccionMin = potenciaCalculada * produccionEspecifica * 0.95; // 5% pérdidas adicionales conservadoras
    produccionMax = potenciaCalculada * produccionEspecifica;

    // Ahorro anual (€) = Producción * Ratio * Precio_kWh
    const ratio = BENCHMARKS_FV.ratio_autoconsumo_sin_bateria;
    const precioKwh = BENCHMARKS_FV.precio_kwh_defecto.valor;
    
    ahorroMin = produccionMin * ratio.min * precioKwh;
    ahorroMax = produccionMax * ratio.max * precioKwh;

    // Inversión (€) = Potencia * Coste_kWp
    const costeKwp = BENCHMARKS_FV.coste_eur_por_kwp[sector];
    inversionMin = potenciaCalculada * costeKwp.min;
    inversionMax = potenciaCalculada * costeKwp.max;

    // Amortización (años) = Inversión / Ahorro
    // Mejor caso (amortización rápida): mínima inversión, máximo ahorro
    amortizacionMin = inversionMin / ahorroMax;
    // Peor caso (amortización lenta): máxima inversión, mínimo ahorro
    amortizacionMax = inversionMax / ahorroMin;
  }

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
              onChange={(e) => setSector(e.target.value as any)}
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

        {showBannerSuperficie && (
          <div className="mb-6 flex items-start gap-2.5 rounded-lg bg-warning/10 p-3 text-sm text-warning">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <p>
              La potencia deseada <strong>no cabe</strong> en la superficie indicada 
              (mínimo {BENCHMARKS_FV.m2_por_kwp.min} m²/kWp). El cálculo se ha ajustado a la potencia máxima posible: 
              <strong> {potenciaCalculada.toFixed(2)} kWp</strong>.
            </p>
          </div>
        )}

        {isValid ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border bg-bg p-4">
                <p className="text-xs text-text-secondary">Producción Anual</p>
                <p className="mt-1 text-lg font-semibold text-text-primary">
                  {Math.round(produccionMin).toLocaleString("es-ES")} - {Math.round(produccionMax).toLocaleString("es-ES")} <span className="text-sm font-normal text-text-secondary">kWh</span>
                </p>
              </div>
              <div className="rounded-lg border border-border bg-bg p-4">
                <p className="text-xs text-text-secondary">Ahorro Estimado (1er año)</p>
                <p className="mt-1 text-lg font-semibold text-success">
                  {Math.round(ahorroMin).toLocaleString("es-ES")}€ - {Math.round(ahorroMax).toLocaleString("es-ES")}€
                </p>
              </div>
              <div className="rounded-lg border border-border bg-bg p-4">
                <p className="text-xs text-text-secondary">Inversión Llave en Mano</p>
                <p className="mt-1 text-lg font-semibold text-text-primary">
                  {Math.round(inversionMin).toLocaleString("es-ES")}€ - {Math.round(inversionMax).toLocaleString("es-ES")}€
                </p>
              </div>
              <div className="rounded-lg border border-border bg-bg p-4">
                <p className="text-xs text-text-secondary">Periodo de Amortización</p>
                <p className="mt-1 text-lg font-semibold text-text-primary">
                  {amortizacionMin.toFixed(1)} - {amortizacionMax.toFixed(1)} <span className="text-sm font-normal text-text-secondary">años</span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-text-secondary">
              <Info size={14} className="mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p>Las cifras son <strong>orientativas</strong> y se calculan mediante parámetros estadísticos del mercado:</p>
                <ul className="list-disc pl-4 opacity-80">
                  <li>Precio de la energía: {BENCHMARKS_FV.precio_kwh_defecto.valor} €/kWh (Impuestos incluidos. No incluye término de potencia).</li>
                  <li>Coste de instalación subvencionable {sector}: {BENCHMARKS_FV.coste_eur_por_kwp[sector].min} - {BENCHMARKS_FV.coste_eur_por_kwp[sector].max} €/kWp.</li>
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
