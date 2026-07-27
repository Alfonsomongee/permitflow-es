"use client";

import { useState } from "react";
import { Download, Loader2, Printer } from "lucide-react";

interface ExportPdfButtonProps {
  titulo?: string;
  /** Si existe, descarga el PDF white-label generado en servidor */
  expedienteId?: string;
}

export function ExportPdfButtons({ titulo, expedienteId }: ExportPdfButtonProps) {
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);

  const handleDownload = async () => {
    if (!expedienteId) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/expedientes/${expedienteId}/documentos?tipo=plan`);
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
      // Manejar error silencioso o con toast si tuvieramos
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {

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
    <div className="flex gap-2">
      {expedienteId && (
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-text-primary shadow-sm transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          {downloading ? (
            <Loader2 size={13} className="animate-spin" aria-hidden />
          ) : (
            <Download size={13} aria-hidden />
          )}
          Descargar PDF
        </button>
      )}
      <button
        onClick={handlePrint}
        disabled={printing}
        className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-text-primary shadow-sm transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
      >
        {printing ? (
          <Loader2 size={13} className="animate-spin" aria-hidden />
        ) : (
          <Printer size={13} aria-hidden />
        )}
        Imprimir
      </button>
    </div>
  );
}
