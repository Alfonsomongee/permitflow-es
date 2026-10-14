"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { capturar } from "@/lib/analytics/posthog";
import { StepIndicator } from "./StepIndicator";
import { Step1TipoUbicacion } from "./Step1TipoUbicacion";
import { Step2ParametrosTecnicos } from "./Step2ParametrosTecnicos";
import { Step3Ayudas } from "./Step3Ayudas";
import { PresupuestoButton } from "./PresupuestoButton";

export function NuevaInstalacionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<StepId>(1);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Si se llega desde el simulador de ahorro (?potencia=X), prellenamos la
  // potencia recomendada calculada allí en vez de que el usuario tenga que
  // volver a introducirla -- antes el simulador y el wizard estaban
  // completamente desconectados (mejora 2026-08-07). tipo_instalacion y uso
  // ya son "fotovoltaica_autoconsumo"/"residencial" por defecto (el único
  // caso que llega desde el simulador), así que no hace falta forzarlos.
  const potenciaSugerida = searchParams.get("potencia");
  const initialValues: FormState = potenciaSugerida
    ? { ...FORM_INITIAL, potencia_kw: potenciaSugerida }
    : FORM_INITIAL;

  const methods = useForm<FormState>({
    resolver: zodResolver(nuevaInstalacionSchema),
    defaultValues: initialValues,
    mode: "onTouched",
  });

  const {
    handleSubmit,
    trigger,
    watch,
    formState: { isValid, errors },
  } = methods;

  // Needed for the StepIndicator which receives formState
  const currentFormValues = watch();

  const handleNext = async () => {
    // Paso 2: se validan TODOS los campos (antes una lista manual omitía los de
    // ACS/Legionela, implantación, etc. y el error solo aparecía en el paso 3 como
    // un botón deshabilitado sin explicación). Los superRefine solo generan error
    // para los campos que aplican a la combinación elegida.
    const fieldsToValidate: (keyof FormState)[] | undefined =
      step === 1 ? ["tipo_instalacion", "comunidad", "uso"] : undefined;

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
    if (loading) return; // evita expedientes duplicados por doble clic / Enter repetido
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

      // Solo categorías (tipo/comunidad/uso), nunca datos identificativos
      // del cliente -- mejoras 2026-08-07.
      capturar("expediente_creado", {
        tipo_instalacion: data.tipo_instalacion,
        comunidad: data.comunidad,
        uso: data.uso,
      });
      router.push(`/expedientes/${resData.expedienteId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado al clasificar.";
      setServerError(message);
      setLoading(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <div className="bg-bg">
        {/* Antes había aquí una segunda cabecera con logo (la app ya tiene Sidebar y
            Topbar): duplicaba la marca y desperdiciaba altura. */}
        <div className="mx-auto flex max-w-4xl justify-end px-4 pt-4 md:px-6">
          <button
            type="button"
            onClick={() => router.push("/expedientes")}
            className="text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            Cancelar
          </button>
        </div>

        <main className="mx-auto grid max-w-4xl grid-cols-1 gap-6 px-4 py-8 md:grid-cols-[260px_1fr] md:gap-0 md:px-6 md:py-10">
          <aside className="pt-1 md:pr-10">
            <p className="mb-5 text-xs font-medium uppercase tracking-wider text-text-secondary">
              Pasos
            </p>
            <StepIndicator steps={STEPS} currentStep={step} formState={currentFormValues} />
          </aside>

          <form
            noValidate
            className="flex flex-col gap-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (step < 3) void handleNext();
              else void handleSubmit(onSubmit)();
            }}
          >
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

            {step === 3 && !isValid && Object.keys(errors).length > 0 && (
              <div
                role="alert"
                className="rounded-lg border border-warning/30 bg-warning-light px-4 py-3 text-sm text-warning-dark"
              >
                <p className="font-medium">Faltan datos por completar antes de generar el plan:</p>
                <ul className="mt-1 list-disc pl-5">
                  {Object.entries(errors).map(([campo, err]) => (
                    <li key={campo}>{(err as { message?: string })?.message ?? campo}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="mt-2 text-sm font-medium underline underline-offset-2"
                >
                  Volver a los parámetros técnicos
                </button>
              </div>
            )}

            {serverError && (
              <p className="rounded-lg border border-danger/30 bg-danger-light px-4 py-3 text-sm text-danger-dark font-medium" aria-live="polite">
                {serverError}
              </p>
            )}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleBack}
                disabled={step === 1}
                className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowLeft size={16} aria-hidden />
                Anterior
              </button>

              {step < 3 ? (
                <button
                  type="submit"
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
                    type="submit"
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
          </form>
        </main>
      </div>
    </FormProvider>
  );
}
