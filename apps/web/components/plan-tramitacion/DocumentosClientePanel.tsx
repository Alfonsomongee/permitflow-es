"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Download, FileCheck2, Loader2 } from "lucide-react";

interface DocumentoCliente {
  id: string;
  tramiteOrden: number;
  documentoId: string;
  documentoLabel: string;
  nombreOriginal: string;
  tamanoBytes: number;
  subidoEn: string;
  url: string | null;
}

function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Panel del expediente (lado instalador/gestoría): documentación que el
 * propietario final ha subido desde el portal público (portal/[token]).
 * Mismo patrón colapsable que HistorialPanel.tsx. Las URLs de descarga son
 * firmadas y caducan a los 5 minutos (bucket privado) -- se piden de nuevo
 * cada vez que se abre el panel, no se cachean entre aperturas.
 */
export function DocumentosClientePanel({ expedienteId }: { expedienteId: string }) {
  const [documentos, setDocumentos] = useState<DocumentoCliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState(false);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    if (!abierto || cargado) return;
    let cancelado = false;
    setCargando(true);
    (async () => {
      try {
        const res = await fetch(`/api/expedientes/${expedienteId}/documentos-cliente`);
        if (!res.ok) return;
        const data = (await res.json()) as { documentos?: DocumentoCliente[] };
        if (!cancelado) {
          setDocumentos(data.documentos ?? []);
          setCargado(true);
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [abierto, cargado, expedienteId]);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between"
        aria-expanded={abierto}
      >
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          <FileCheck2 size={12} aria-hidden />
          Documentos del cliente
        </span>
        {abierto && cargando ? (
          <Loader2 size={14} className="animate-spin text-text-secondary" aria-hidden />
        ) : (
          <ChevronDown
            size={14}
            className={`text-text-secondary transition-transform ${abierto ? "rotate-180" : ""}`}
            aria-hidden
          />
        )}
      </button>

      {abierto && !cargando && (
        <div className="mt-3">
          {documentos.length === 0 ? (
            <p className="text-xs text-text-secondary">
              El cliente todavía no ha subido ningún documento.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {documentos.map((doc) => (
                <li key={doc.id} className="flex items-start justify-between gap-2 rounded-lg border border-border/70 px-2.5 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-text-primary">{doc.nombreOriginal}</p>
                    <p className="mt-0.5 text-[10px] text-text-secondary">
                      {doc.documentoLabel} · trámite {doc.tramiteOrden} · {formatearTamano(doc.tamanoBytes)}
                    </p>
                  </div>
                  {doc.url && (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-shrink-0 items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                    >
                      <Download size={12} aria-hidden />
                      Descargar
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
