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

const BOTONES: Array<{
  tipo: TipoDocumento;
  label: string;
  icon: typeof FileText;
  soloMtd?: boolean;
}> = [
  { tipo: "plan", label: "Plan de tramitación (PDF)", icon: FileText },
  { tipo: "checklist", label: "Checklist documentación (PDF)", icon: ListChecks },
  { tipo: "mtd", label: "Borrador MTD (DOCX)", icon: FileType2, soloMtd: true },
  { tipo: "dossier", label: "Dossier completo (ZIP)", icon: FileArchive },
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
      const res = await fetch(
        `/api/expedientes/${expedienteId}/documentos?tipo=${tipo}`
      );

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
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
        <FileText size={11} aria-hidden />
        Documentos
      </p>

      <div className="flex flex-col gap-2">
        {BOTONES.filter(
          (b) => !b.soloMtd || VERTICALES_MTD.has(tipoInstalacion)
        ).map(({ tipo, label, icon: Icon }) => (
          <button
            key={tipo}
            onClick={() => descargar(tipo)}
            disabled={descargando !== null}
            className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2 text-left text-xs text-text-primary transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {descargando === tipo ? (
              <Loader2 size={13} className="animate-spin" aria-hidden />
            ) : (
              <Icon size={13} aria-hidden />
            )}
            {label}
          </button>
        ))}
      </div>

      {requiereUpgrade && (
        <p className="mt-3 rounded-lg bg-warning-light px-3 py-2 text-xs text-warning-dark">
          La generación de documentos es una función del plan Pro.{" "}
          <Link href="/#precios" className="font-medium underline">
            Ver planes
          </Link>
        </p>
      )}
      {error && <p className="mt-3 text-xs text-danger-dark">{error}</p>}
    </div>
  );
}
