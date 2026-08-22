import Link from "next/link";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import type { DbAlertaBoe } from "@/lib/supabase";
import { alertaImpactaRetroactivamente, type ExpedienteMatch } from "@/lib/alertas";

/**
 * Antes esto mostraba todas las alertas relacionadas en un único tono
 * (aviso): una sugerencia de IA sin revisar, un cambio ya vigente cuando se
 * creó el expediente y un cambio VERIFICADO aplicado DESPUÉS de crearlo se
 * veían exactamente igual. Solo el último caso es impacto retroactivo real
 * -- "el plan que tienes guardado pudo generarse con la normativa anterior"
 * -- y es el que de verdad merece una alerta seria (roadmap de mejoras,
 * PREM-08).
 */
export function AlertasExpedienteBanner({
  alertas,
  expediente,
}: {
  alertas: DbAlertaBoe[];
  expediente: ExpedienteMatch;
}) {
  if (alertas.length === 0) return null;

  const retroactivas = alertas.filter((a) => alertaImpactaRetroactivamente(a, expediente));
  const resto = alertas.filter((a) => !retroactivas.includes(a));

  return (
    <div className="flex flex-col">
      {retroactivas.length > 0 && (
        <div className="border-b border-danger/30 bg-danger-light px-4 py-2 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 text-[11px] text-danger-dark">
            <ShieldAlert size={14} className="flex-shrink-0" aria-hidden />
            <span className="font-medium">
              {retroactivas.length === 1
                ? "1 cambio normativo verificado se aplicó después de crear este expediente:"
                : `${retroactivas.length} cambios normativos verificados se aplicaron después de crear este expediente:`}
            </span>
            <span className="min-w-0 flex-1 truncate">
              {retroactivas.map((a) => a.titulo).join(" · ")}
            </span>
            <Link href="/alertas" className="flex-shrink-0 font-semibold underline hover:text-danger-dark/80">
              Revisar cambios →
            </Link>
          </div>
        </div>
      )}
      {resto.length > 0 && (
        <div className="border-b border-warning/30 bg-warning-light px-4 py-2 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 text-[11px] text-warning-dark">
            <AlertTriangle size={14} className="flex-shrink-0" aria-hidden />
            <span className="font-medium">
              {resto.length === 1
                ? "1 alerta normativa afecta a este expediente:"
                : `${resto.length} alertas normativas afectan a este expediente:`}
            </span>
            <span className="min-w-0 flex-1 truncate">
              {resto.map((a) => a.titulo).join(" · ")}
            </span>
            <Link href="/alertas" className="flex-shrink-0 font-semibold underline hover:text-warning-dark/80">
              Ver detalle →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
