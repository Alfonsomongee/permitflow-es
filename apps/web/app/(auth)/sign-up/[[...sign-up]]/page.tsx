import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, Zap, ShieldCheck } from "lucide-react";
import { clerkTheme } from "@/lib/clerk-theme";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen bg-bg">
      {/* Lado izquierdo: Formulario */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-12 xl:px-24">
        <div className="mx-auto w-full max-w-sm">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={16} />
            Volver al inicio
          </Link>
          
          <div className="mb-8 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <Zap size={16} className="text-white" aria-hidden />
            </div>
            <span className="text-xl font-medium text-text-primary tracking-tight">
              PermitFlow <span className="text-primary font-semibold">ES</span>
            </span>
          </div>

          <SignUp appearance={clerkTheme} />
        </div>
      </div>

      {/* Lado derecho: Imagen / Banner (solo desktop) */}
      <div className="hidden lg:block lg:w-1/2 bg-surface border-l border-border relative">
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="max-w-lg space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold text-text-primary tracking-tight">
                Únete a la nueva era de la gestión administrativa
              </h2>
              <p className="text-lg text-text-secondary">
                Todo lo que necesitas para escalar tus instalaciones sin cuellos de botella burocráticos.
              </p>
            </div>
            
            <ul className="space-y-4">
              {[
                /* Antes decía "Motor normativo automatizado por IA": el motor
                   (motor_normativo/clasificador.py) es reglas json-logic
                   deterministas, sin LLM en la decisión de qué trámite aplica.
                   El argumento de venta real -- y verificable -- es que cada
                   trámite cita su base legal (auditoría de coherencia
                   producto/experiencia 2026-08-12). */
                "Motor normativo con base legal citada, trámite a trámite",
                "Plantillas oficiales autocompletadas",
                "Seguimiento de plazos legales y silencios",
                "Soporte prioritario y acceso a API",
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success-light text-success-dark">
                    <ShieldCheck size={14} />
                  </div>
                  <span className="text-sm font-medium text-text-primary">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
