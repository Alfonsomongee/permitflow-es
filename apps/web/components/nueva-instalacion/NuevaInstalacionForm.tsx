"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, Zap } from "lucide-react";
import {
  type FormState,
  type StepId,
  FORM_INITIAL,
  STEPS,
  buildPlanUrl,
} from "./types";
import { StepIndicator } from "./StepIndicator";
import { Step1TipoUbicacion } from "./Step1TipoUbicacion";
import { Step2ParametrosTecnicos } from "./Step2ParametrosTecnicos";
import { Step3Ayudas } from "./Step3Ayudas";

// ─── Validaciones por paso ────────────────────────────────────────────────────

function validateStep(step: StepId, state: FormState): string | null {
  if (step === 1) {
    if (!state.tipo_instalacion) return "Selecciona el tipo de instalación.";
    if (!state.comunidad) return "Selecciona una comunidad autónoma.";
    if (!state.municipio.trim()) return "Escribe el municipio de la instalación.";
  }
  if (step === 2) {
    const kw = parseFloat(state.potencia_kw);
    if (!state.potencia_kw || isNaN(kw) || kw <= 0)
      return "Introduce una potencia válida (> 0 kW).";
    if (state.tipo_instalacion === "irve") {
      const puntos = parseInt(state.numero_puntos);
      if (!puntos || puntos < 1) return "El número de puntos de recarga debe ser al menos 1.";
    }
  }
  return null;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function NuevaInstalacionForm() {
  const router = useRouter();
  const [step, setStep] = useState<StepId>(1);
  const [state, setState] = useState<FormState>(FORM_INITIAL);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onChange = useCallback((patch: Partial<FormState>) => {
    setState((prev) => ({ ...prev, ...patch }));
    setValidationError(null);
  }, []);

  const handleNext = () => {
    const error = validateStep(step, state);
    if (error) {
      setValidationError(error);
      return;
    }
    if (step < 3) {
      setStep((s) => (s + 1) as StepId);
      setValidationError(null);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as StepId);
  };

  const handleSubmit = async () => {
    const error = validateStep(step, state);
    if (error) {
      setValidationError(error);
      return;
    }
    setLoading(true);
    // Navega a la página del plan pasando los parámetros por URL
    router.push(buildPlanUrl(state));
  };

  const STEP_COMPONENTS: Record<StepId, JSX.Element> = {
    1: <Step1TipoUbicacion state={state} onChange={onChange} />,
    2: <Step2ParametrosTecnicos state={state} onChange={onChange} />,
    3: <Step3Ayudas state={state} onChange={onChange} />,
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Topbar */}
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Zap size={14} className="text-white" aria-hidden />
          </div>
          <span className="text-sm font-medium text-text-primary">
            PermitFlow <span className="text-text-secondary font-normal">· Nueva instalación</span>
          </span>
        </div>
        <button
          onClick={() => router.push("/expedientes")}
          className="text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          Cancelar
        </button>
      </header>

      {/* Layout principal */}
      <main className="mx-auto grid max-w-4xl grid-cols-[260px_1fr] gap-0 py-10 px-6">
        {/* Sidebar con pasos */}
        <aside className="pr-10 pt-1">
          <p className="mb-5 text-xs font-medium uppercase tracking-wider text-text-secondary">
            Pasos
          </p>
          <StepIndicator
            steps={STEPS}
            currentStep={step}
            formState={state}
          />
        </aside>

        {/* Área del formulario */}
        <div className="flex flex-col gap-6">
          {/* Cabecera del paso actual */}
          <div>
            <h1 className="text-lg font-medium text-text-primary">
              {STEPS[step - 1].label}
            </h1>
            <p className="mt-0.5 text-sm text-text-secondary">
              {step === 1 && "Define el tipo de instalación y su localización."}
              {step === 2 && "Introduce los datos técnicos específicos del vertical seleccionado."}
              {step === 3 && "Comprueba si hay programas de ayuda aplicables."}
            </p>
          </div>

          {/* Formulario del paso activo */}
          <div className="rounded-xl border border-border bg-surface p-6">
            {STEP_COMPONENTS[step]}
          </div>

          {/* Error de validación */}
          {validationError && (
            <p className="rounded-lg border border-danger/30 bg-danger-light px-4 py-3 text-sm text-danger-dark">
              {validationError}
            </p>
          )}

          {/* Navegación entre pasos */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm text-text-secondary transition-colors hover:bg-bg disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft size={14} aria-hidden />
              Anterior
            </button>

            {step < 3 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Siguiente
                <ArrowRight size={14} aria-hidden />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden />
                ) : (
                  <Zap size={14} aria-hidden />
                )}
                {loading ? "Clasificando…" : "Generar plan de tramitación"}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
