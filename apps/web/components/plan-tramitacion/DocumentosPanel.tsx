"use client";

import { useState } from "react";
import { FileArchive, FileText, FileType2, ListChecks, Loader2 } from "lucide-react";
import { crearSesionCheckoutPro } from "@/lib/stripe/checkout";

type TipoDocumento = "plan" | "checklist" | "mtd" | "dossier";

// Mantener sincronizado con documentos/contextos.py::VERTICALES_MTD (backend).
// climatizacion_aerotermia/acs solo generan MTD para instalaciones de 5-70 kW
// (RANGO_POTENCIA_MTD_TERMICA_KW); fuera de rango el backend devuelve un 400
// con el mensaje explicando por qué (no se filtra aquí porque este componente
// no recibe la potencia del expediente).
const VERTICALES_MTD = new Set([
  "fotovoltaica_autoconsumo",
  "irve",
  "climatizacion_aerotermia",
  "acs",
]);

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
  const [iniciandoUpgrade, setIniciandoUpgrade] = useState(false);

  const actualizarAPro = async () => {
    setIniciandoUpgrade(true);
    try {
      window.location.href = await crearSesionCheckoutPro();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar el proceso de pago.");
      setIniciandoUpgrade(false);
    }
  };

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
    <div className="p-2">
      <div className="flex flex-col gap-2.5">
        {BOTONES.filter((b) => !b.soloMtd || VERTICALES_MTD.has(tipoInstalacion)).map(({ tipo, label, desc, icon: Icon, color, bg }) => (
          <button
            key={tipo}
            onClick={() => descargar(tipo)}
            disabled={descargando !== null}
            className="group relative flex w-full items-center gap-3.5 overflow-hidden rounded-xl border border-border bg-surface p-3 text-left transition-all hover:border-primary/40 hover:shadow-sm disabled:opacity-50"
          >
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${bg} ${color} transition-transform duration-300 group-hover:scale-110`}>
              {descargando === tipo ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Icon size={18} aria-hidden />}
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-text-primary transition-colors group-hover:text-primary">
                {label}
              </span>
              <span className="block truncate text-[11px] font-medium text-text-secondary mt-0.5">
                {desc}
              </span>
            </div>
            {/* Indicador de acción (flecha animada) */}
            <div className="absolute right-3 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 -translate-x-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
                <path d="M5 12h14"></path>
                <path d="m12 5 7 7-7 7"></path>
              </svg>
            </div>
          </button>
        ))}
      </div>

      {requiereUpgrade && (
        <p className="mt-3 rounded-xl border border-warning/30 bg-warning-light px-3.5 py-2.5 text-xs text-warning-dark">
          La descarga de documentos es una función del plan Pro.{" "}
          <button
            onClick={actualizarAPro}
            disabled={iniciandoUpgrade}
            className="font-semibold underline hover:text-warning-dark/80 disabled:opacity-60"
          >
            {iniciandoUpgrade ? "Abriendo pago..." : "Actualizar a Pro"}
          </button>
        </p>
      )}
      {error && <p className="mt-3 text-xs text-danger-dark">{error}</p>}
    </div>
  );
}
