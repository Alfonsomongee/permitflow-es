import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { DbAlertaBoe } from "@/lib/supabase";

export function AlertasExpedienteBanner({ alertas }: { alertas: DbAlertaBoe[] }) {
  if (alertas.length === 0) return null;

  return (
    <div className="border-b border-warning/30 bg-warning-light px-4 py-2.5 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 text-xs text-warning-dark">
        <AlertTriangle size={13} className="flex-shrink-0" aria-hidden />
        <span className="font-medium">
          {alertas.length === 1
            ? "1 alerta normativa sin leer afecta a este expediente:"
            : `${alertas.length} alertas normativas sin leer afectan a este expediente:`}
        </span>
        <span className="min-w-0 flex-1 truncate">{alertas[0].titulo}</span>
        <Link href="/alertas" className="flex-shrink-0 font-medium underline">
          Ver alertas →
        </Link>
      </div>
    </div>
  );
}
