import { Check } from "lucide-react";
import { type StepId, type StepMeta, type FormState } from "./types";
import { motion } from "framer-motion";

interface StepIndicatorProps {
  steps: StepMeta[];
  currentStep: StepId;
  formState: FormState;
}

export function StepIndicator({ steps, currentStep, formState }: StepIndicatorProps) {
  return (
    <nav aria-label="Pasos del formulario">
      <ol className="flex flex-col">
        {steps.map((step, index) => {
          const isDone = step.id < currentStep;
          const isActive = step.id === currentStep;
          const isPending = step.id > currentStep;
          const isLast = index === steps.length - 1;

          return (
            <li key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
              {/* Línea conectora */}
              {!isLast && (
                <div
                  className="absolute left-[13px] top-8 h-[calc(100%-1rem)] w-px bg-border"
                  aria-hidden
                >
                  {isDone && (
                    <motion.div
                      layoutId={`line-${step.id}`}
                      className="absolute left-0 top-0 w-full bg-primary"
                      initial={{ height: 0 }}
                      animate={{ height: "100%" }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </div>
              )}

              {/* Indicador circular */}
              <div
                className={`
                  relative z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center
                  rounded-full text-xs font-medium transition-colors duration-300
                  ${isDone ? "bg-primary text-white shadow-xs" : ""}
                  ${isActive ? "bg-primary shadow-card ring-4 ring-primary/20 text-white" : ""}
                  ${isPending ? "border-2 border-border bg-surface text-text-secondary" : ""}
                `}
                aria-current={isActive ? "step" : undefined}
              >
                {isDone ? (
                  <Check size={14} className="text-white" aria-hidden />
                ) : (
                  <span>{step.id}</span>
                )}
              </div>

              {/* Textos */}
              <div className="flex-1 pt-1">
                <p
                  className={`text-sm font-medium transition-colors duration-300 ${
                    isActive ? "text-text-primary" : "text-text-secondary"
                  }`}
                >
                  {step.label}
                </p>
                <p className="mt-1 max-w-[200px] truncate text-xs text-text-secondary opacity-80">
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
