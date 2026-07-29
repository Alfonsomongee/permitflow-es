"use client";

import { useState } from "react";
import { Check, Copy, Link2, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface PortalClienteCardProps {
  expedienteId: string;
}

/**
 * Genera un enlace público de solo lectura (/portal/[token]) para que el
 * propietario final de la instalación pueda ver el estado de su expediente
 * sin necesitar cuenta ni acceso a PermitFlow. No expone notas internas,
 * historial de auditoría ni datos de facturación — solo el plan y su avance.
 */
export function PortalClienteCard({ expedienteId }: PortalClienteCardProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const generar = async (regenerar = false) => {
    setCargando(true);
    try {
      const res = await fetch(`/api/expedientes/${expedienteId}/compartir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerar }),
      });
      const data = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
      if (!res.ok || !data.token) throw new Error(data.error ?? `Error ${res.status}`);
      setUrl(`${window.location.origin}/portal/${data.token}`);
      if (regenerar) toast.success("Enlace regenerado. El anterior ya no funciona.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo generar el enlace.");
    } finally {
      setCargando(false);
    }
  };

  const copiar = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
        <Link2 size={12} aria-hidden />
        Portal de cliente
      </p>
      <p className="mb-3 text-xs leading-relaxed text-text-secondary">
        Comparte un enlace de solo lectura para que el propietario vea el
        estado de su instalación sin necesitar cuenta.
      </p>

      {!url ? (
        <button
          onClick={() => generar(false)}
          disabled={cargando}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary-light px-4 py-2.5 text-xs font-semibold text-primary-dark transition-colors hover:bg-primary/10 disabled:opacity-50"
        >
          {cargando ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <Link2 size={13} aria-hidden />}
          Generar enlace para el cliente
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-bg px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-[11px] text-text-secondary">{url}</span>
            <button
              onClick={copiar}
              className="flex-shrink-0 text-text-secondary hover:text-primary"
              aria-label="Copiar enlace"
            >
              {copiado ? <Check size={14} className="text-success" aria-hidden /> : <Copy size={14} aria-hidden />}
            </button>
          </div>
          <button
            onClick={() => generar(true)}
            disabled={cargando}
            className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-danger-dark disabled:opacity-50"
          >
            <RefreshCw size={11} aria-hidden />
            Regenerar (invalida el anterior)
          </button>
        </div>
      )}
    </div>
  );
}
