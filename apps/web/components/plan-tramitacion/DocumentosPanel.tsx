"use client";

import { useState } from "react";
import Link from "next/link";
import { FileArchive, FileText, FileType2, ListChecks, Loader2 } from "lucide-react";

type TipoDocumento = "plan" | "checklist" | "mtd" | "dossier";

const VERTICALES_MTD = new Set(["fotovoltaica_autoconsumo", "irve"]);

interface DocumentosPanelProps {
  expedienteId: string;
  tipoInstalacion: string;
}

const BOTONES: Array<{ tipo: TipoDocumento; label: string; desc: string; icon: typeof FileText; color: string; bg: string; soloMtd?: boolean }> = [
  { tipo: "plan", label: "Plan de tramitación", desc: "PDF con la ruta completa", icon: FileText, color: "text-primary", bg: "bg-primary-light" },
  { tipo: "checklist", label: "Checklist documentos", desc: "Todos los requisitos", icon: ListChecks, color: "text-success-dark", bg: "bg-success-light" },
  { tipo: "mtd", label: "Borrador MTD", desc: "DOCX editable", icon: FileType2, color: "text-blue-600", bg: "bg-blue-100", soloMtd: true },
  { tipo: "dossier", label: "Dossier completo", desc: "Todo en un ZIP", icon: FileArchive, color: "text-warning-dark", bg: "bg-warning-light" },
];

export function DocumentosPanel({ expedienteId, tipoInstalacion }: DocumentosPanelProps) {
  const [descargando, setDescargando] = useState<TipoDocumento | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requiereUpgrade, setRequiereUpgrade] = useState(false);

  const descargar = async (tipo: TipoDocumento) => {
    if (descargando) return;
    setDescargando(tipo);
    setError(null);
    setRequiereUpgrade(false);

    try {
      const res = await fetch(`/api/expedientes/${expedienteId}/documentos?tipo=${tipo}`);

      if (res.status === 402) {
        setRequiereUpgrade(true);
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: unknown };
        const mensaje =
          typeof data.error === "string" ? data.error : `Error ${res.status}`;
        throw new Error(mensaje);
      }

      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="?([^";]+)"?/.exec(disposition);
      const filename = match?.[1] ?? `permitflow_${tipo}`;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el documento.");
    } finally {
      setDescargando(null);
    }
  };

  return (
    <div className="p-3">

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {BOTONES.filter((b) => !b.soloMtd || VERTICALES_MTD.has(tipoInstalacion)).map(({ tipo, label, desc, icon: Icon, color, bg }) => (
          <button
            key={tipo}
            onClick={() => descargar(tipo)}
            disabled={descargando !== null}
            className="flex items-center gap-3 rounded-xl border border-border bg-bg px-3 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-surface disabled:opacity-50"
          >
            <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${bg} ${color}`}>
              {descargando === tipo ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Icon size={15} aria-hidden />}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-text-primary">{label}</span>
              <span className="block truncate text-[10px] text-text-secondary">{desc}</span>
            </span>
          </button>
        ))}
      </div>

      {requiereUpgrade && (
        <p className="mt-3 rounded-xl border border-warning/30 bg-warning-light px-3.5 py-2.5 text-xs text-warning-dark">
          La descarga de documentos es una función del plan Pro.{" "}
          <Link href="/#precios" className="font-semibold underline hover:text-warning-dark/80">
            Ver planes
          </Link>
        </p>
      )}
      {error && <p className="mt-3 text-xs text-danger-dark">{error}</p>}
    </div>
  );
}
