"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, Zap } from "lucide-react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";

import {
  type FormState,
  type StepId,
  FORM_INITIAL,
  STEPS,
} from "./types";
import { nuevaInstalacionSchema } from "../../lib/validations/nuevaInstalacion";
import { StepIndicator } from "./StepIndicator";
import { Step1TipoUbicacion } from "./Step1TipoUbicacion";
import { Step2ParametrosTecnicos } from "./Step2ParametrosTecnicos";
import { Step3Ayudas } from "./Step3Ayudas";
import { PresupuestoButton } from "./PresupuestoButton";

export function NuevaInstalacionForm() {
  const router = useRouter();
  const [step, setStep] = useState<StepId>(1);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const methods = useForm<FormState>({
    resolver: zodResolver(nuevaInstalacionSchema),
    defaultValues: FORM_INITIAL,
    mode: "onTouched",
  });

  const {
    handleSubmit,
    trigger,
    watch,
    formState: { isValid },
  } = methods;

  // Needed for the StepIndicator which receives formState
  const currentFormValues = watch();

  const handleNext = async () => {
    // Determine fields to validate based on current step
    let fieldsToValidate: (keyof FormState)[] = [];
    if (step === 1) {
      fieldsToValidate = ["tipo_instalacion", "comunidad", "uso"];
    } else if (step === 2) {
      fieldsToValidate = [
        "potencia_kw",
        "superficie_m2",
        "numero_puntos",
        "potencia_por_punto_kw",
        "modo_recarga",
        "acceso_publico",
        "ubicacion_irve",
        "requiere_nuevo_suministro",
        "combustible",
        "presion_bar",
        "tension",
        "modalidad_autoconsumo",
        "ubicacion_suelo",
        "requiere_acceso_conexion",
        "potencia_resultante_kw",
        "presion_resultante_bar",
        "incremento_potencia_pct",
        "uso_edificio",
        "ventilacion_garaje",
        "numero_plazas_garaje",
        "garaje_existente",
        "incluida_ambito_legionella",
      ];
    }

    const isStepValid = await trigger(fieldsToValidate);
    
    if (isStepValid && step < 3) {
      setStep((s) => (s + 1) as StepId);
      setServerError(null);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as StepId);
  };

  const onSubmit = async (data: FormState) => {
    setLoading(true);
    setServerError(null);

    try {
      const res = await fetch("/api/clasificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const resData = (await res
        .json()
        .catch(() => ({ error: "Respuesta inesperada del servidor." }))) as {
        expedienteId?: string;
        error?: unknown;
      };
      if (!res.ok || !resData.expedienteId) {
        const errorMessage =
          typeof resData.error === "string" && resData.error.trim().length > 0
            ? resData.error
            : "No se pudo generar el plan de tramitación.";
        throw new Error(errorMessage);
      }

      router.push(`/expedientes/${resData.expedienteId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado al clasificar.";
      setServerError(message);
      setLoading(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <div className="min-h-screen bg-bg">
        <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <Zap size={14} className="text-white" aria-hidden />
            </div>
            <span className="text-sm font-medium text-text-primary">
              PermitFlow <span className="text-text-secondary font-normal">- Nueva instalación</span>
            </span>
          </div>
          <button
            onClick={() => router.push("/expedientes")}
            className="text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            Cancelar
          </button>
        </header>

        <main className="mx-auto grid max-w-4xl grid-cols-1 gap-6 px-4 py-8 md:grid-cols-[260px_1fr] md:gap-0 md:px-6 md:py-10">
          <aside className="pt-1 md:pr-10">
            <p className="mb-5 text-xs font-medium uppercase tracking-wider text-text-secondary">
              Pasos
            </p>
            <StepIndicator steps={STEPS} currentStep={step} formState={currentFormValues} />
          </aside>

          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-xl font-medium text-text-primary">
                {STEPS[step - 1].label}
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                {step === 1 && "Define el tipo de instalación y su localización."}
                {step === 2 && "Introduce los datos técnicos específicos del vertical seleccionado."}
                {step === 3 && "Comprueba si hay programas de ayuda aplicables."}
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="p-4 md:p-6"
                >
                  {step === 1 && <Step1TipoUbicacion />}
                  {step === 2 && <Step2ParametrosTecnicos />}
                  {step === 3 && <Step3Ayudas />}
                </motion.div>
              </AnimatePresence>
            </div>

            {serverError && (
              <p className="rounded-lg border border-danger/30 bg-danger-light px-4 py-3 text-sm text-danger-dark font-medium" aria-live="polite">
                {serverError}
              </p>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={handleBack}
                disabled={step === 1}
                className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowLeft size={16} aria-hidden />
                Anterior
              </button>

              {step < 3 ? (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary-dark focus:ring-4 focus:ring-primary/20 active:scale-95"
                >
                  Siguiente
                  <ArrowRight size={16} aria-hidden />
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <PresupuestoButton 
                    formState={currentFormValues} 
                    disabled={loading || !isValid} 
                  />
                  <button
                    onClick={handleSubmit(onSubmit)}
                    disabled={loading || !isValid}
                    className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary-dark focus:ring-4 focus:ring-primary/20 disabled:opacity-60 active:scale-[0.98]"
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" aria-hidden />
                    ) : (
                      <Zap size={16} aria-hidden />
                    )}
                    {loading ? "Clasificando..." : "Generar plan de tramitación"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </FormProvider>
  );
}
