import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { DbAlertaBoe } from "@/lib/supabase";

export function AlertasExpedienteBanner({ alertas }: { alertas: DbAlertaBoe[] }) {
  if (alertas.length === 0) return null;

  return (
    <div className="border-b border-warning/30 bg-warning-light px-4 py-2 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 text-[11px] text-warning-dark">
        <AlertTriangle size={14} className="flex-shrink-0" aria-hidden />
        <span className="font-medium">
          {alertas.length === 1
            ? "1 alerta normativa afecta a este expediente:"
            : `${alertas.length} alertas normativas afectan a este expediente:`}
        </span>
        <span className="min-w-0 flex-1 truncate">
          {alertas.map(a => a.titulo).join(' · ')}
        </span>
        <Link href="/alertas" className="flex-shrink-0 font-semibold underline hover:text-warning-dark/80">
          Ver detalle →
        </Link>
      </div>
    </div>
  );
}
