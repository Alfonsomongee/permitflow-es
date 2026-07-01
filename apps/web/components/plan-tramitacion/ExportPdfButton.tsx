"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

interface ExportPdfButtonProps {
  titulo?: string;
}

export function ExportPdfButton({ titulo }: ExportPdfButtonProps) {
  const [printing, setPrinting] = useState(false);

  const handlePrint = () => {
    setPrinting(true);

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
