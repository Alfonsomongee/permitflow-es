import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FECHA_ULTIMA_ACTUALIZACION_LEGAL } from "@/content/titular";

export function LegalPage({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary"
      >
        <ArrowLeft size={14} aria-hidden /> Volver al inicio
      </Link>
      <h1 className="mb-1 text-3xl font-medium tracking-tight text-text-primary">{titulo}</h1>
      <p className="mb-8 text-xs text-text-secondary">
        Última actualización: {new Date(`${FECHA_ULTIMA_ACTUALIZACION_LEGAL}T00:00:00Z`).toLocaleDateString("es-ES", {
          day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
        })}
      </p>
      <div className="space-y-6 text-sm leading-relaxed text-text-secondary [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-medium [&_h2]:text-text-primary [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
    </main>
  );
}

/** Dato del titular o marca visible de que falta (nunca se inventa). */
export function DatoTitular({ valor }: { valor: string | null }) {
  if (valor && valor.trim()) return <>{valor}</>;
  return (
    <span className="rounded bg-warning-light px-1.5 py-0.5 text-xs font-medium text-warning-dark">
      pendiente de completar por el titular
    </span>
  );
}
