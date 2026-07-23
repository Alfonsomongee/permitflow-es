"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import type { FormState } from "./types";

/**
 * Genera un presupuesto comercial en PDF sin crear expediente.
 * Disponible en todos los planes (con marca PermitFlow en el gratuito).
 */
export function PresupuestoButton({
  formState,
  disabled = false,
}: {
  formState: FormState;
  disabled?: boolean;
}) {
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerar = async () => {
    if (generando || disabled) return;
    setGenerando(true);
    setError(null);
    try {
      const res = await fetch("/api/presupuesto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Error ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = "Presupuesto_tramitacion.pdf";
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el presupuesto.");
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={handleGenerar}
        disabled={disabled || generando}
        title="Descarga un PDF de una página para adjuntar a tu oferta, sin crear expediente"
        className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
      >
        {generando ? (
          <Loader2 size={14} className="animate-spin" aria-hidden />
        ) : (
          <FileDown size={14} aria-hidden />
        )}
        Presupuesto PDF
      </button>
      {error && <p className="text-xs text-danger-dark">{error}</p>}
    </div>
  );
}
