import { Check } from "lucide-react";
import { type StepId, type StepMeta, type FormState } from "./types";

interface StepIndicatorProps {
  steps: StepMeta[];
  currentStep: StepId;
  formState: FormState;
}

export function StepIndicator({ steps, currentStep, formState }: StepIndicatorProps) {
  return (
    <nav aria-label="Pasos del formulario">
      <ol className="flex flex-col gap-0">
        {steps.map((step) => {
          const isDone = step.id < currentStep;
          const isActive = step.id === currentStep;
          const isPending = step.id > currentStep;

          return (
            <li key={step.id} className="flex gap-3 py-4 border-b border-border last:border-0">
              {/* Indicador de estado */}
              <div
                className={`
                  mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center
                  rounded-full text-xs font-medium
                  ${isDone ? "bg-success-light text-success-dark" : ""}
                  ${isActive ? "bg-primary text-white" : ""}
                  ${isPending ? "border border-border bg-surface text-text-secondary" : ""}
                `}
                aria-current={isActive ? "step" : undefined}
              >
                {isDone ? (
                  <Check size={12} aria-hidden />
                ) : (
                  <span>{step.id}</span>
                )}
              </div>

              {/* Texto del paso */}
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium leading-snug ${
                    isActive ? "text-text-primary" : "text-text-secondary"
                  }`}
                >
                  {step.label}
                </p>
                <p className="mt-0.5 text-xs text-text-secondary leading-snug truncate">
                  {step.description(formState)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
