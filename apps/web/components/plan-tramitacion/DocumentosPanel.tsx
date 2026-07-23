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

const BOTONES: Array<{ tipo: TipoDocumento; label: string; desc: string; icon: typeof FileText; soloMtd?: boolean }> = [
  { tipo: "plan", label: "Plan de tramitación", desc: "PDF con la hoja de ruta completa", icon: FileText },
  { tipo: "checklist", label: "Checklist documentación", desc: "PDF con todos los documentos a reunir", icon: ListChecks },
  { tipo: "mtd", label: "Borrador MTD", desc: "DOCX editable", icon: FileType2, soloMtd: true },
  { tipo: "dossier", label: "Dossier completo", desc: "Todo en un ZIP", icon: FileArchive },
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
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Error ${res.status}`);
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
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
        <FileText size={12} aria-hidden />
        Documentos
      </p>

      <div className="flex flex-col gap-2">
        {BOTONES.filter((b) => !b.soloMtd || VERTICALES_MTD.has(tipoInstalacion)).map(({ tipo, label, desc, icon: Icon }) => (
          <button
            key={tipo}
            onClick={() => descargar(tipo)}
            disabled={descargando !== null}
            className="flex items-center gap-3 rounded-xl border border-border bg-bg px-3.5 py-3 text-left transition-colors hover:border-primary hover:bg-primary-light disabled:opacity-50"
          >
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-surface text-primary">
              {descargando === tipo ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Icon size={15} aria-hidden />}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-text-primary">{label}</span>
              <span className="block truncate text-[11px] text-text-secondary">{desc}</span>
            </span>
          </button>
        ))}
      </div>

      {requiereUpgrade && (
        <p className="mt-3 rounded-xl bg-warning-light px-3.5 py-2.5 text-xs text-warning-dark">
          La generación de documentos es una función del plan Pro.{" "}
          <Link href="/#precios" className="font-semibold underline">
            Ver planes
          </Link>
        </p>
      )}
      {error && <p className="mt-3 text-xs text-danger-dark">{error}</p>}
    </div>
  );
}
