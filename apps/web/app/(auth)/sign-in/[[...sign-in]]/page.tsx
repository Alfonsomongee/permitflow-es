import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";
import { clerkTheme } from "@/lib/clerk-theme";

export default function SignInPage() {
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

          <SignIn appearance={clerkTheme} />
        </div>
      </div>

      {/* Lado derecho: Imagen / Banner (solo desktop) */}
      <div className="hidden lg:block lg:w-1/2 bg-primary-light relative">
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="max-w-lg text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-white shadow-sm">
              <Zap size={32} className="text-primary" />
            </div>
            <h2 className="text-3xl font-semibold text-primary-dark tracking-tight">
              Tramitación acelerada para instaladoras técnicas
            </h2>
            <p className="text-lg text-primary-dark/80">
              Clasifica proyectos, autocompleta formularios oficiales y gestiona tus expedientes administrativos desde un solo lugar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
