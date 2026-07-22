"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

interface ExportPdfButtonProps {
  titulo?: string;
  /** Si existe, descarga el PDF white-label generado en servidor */
  expedienteId?: string;
}

export function ExportPdfButton({ titulo, expedienteId }: ExportPdfButtonProps) {
  const [printing, setPrinting] = useState(false);

  const handlePrint = async () => {
    setPrinting(true);

    if (expedienteId) {
      try {
        const res = await fetch(
          `/api/expedientes/${expedienteId}/documentos?tipo=plan`
        );
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `PermitFlow_${titulo ?? "plan"}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch {
        // Fallback silencioso a impresión (p. ej. plan Free → 402)
        window.print();
      } finally {
        setPrinting(false);
      }
      return;
    }

    const prevTitle = document.title;
    if (titulo) {
      document.title = `PermitFlow - ${titulo}`;
    }

    setTimeout(() => {
      window.print();
      document.title = prevTitle;
      setPrinting(false);
    }, 150);
  };

  return (
    <button
      onClick={handlePrint}
      disabled={printing}
      className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-bg disabled:opacity-50"
    >
      {printing ? (
        <Loader2 size={13} className="animate-spin" aria-hidden />
      ) : (
        <Download size={13} aria-hidden />
      )}
      Exportar PDF
    </button>
  );
}
