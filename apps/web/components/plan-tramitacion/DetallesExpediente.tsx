"use client";

import { useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

interface DetallesExpedienteProps {
  expedienteId: string;
  referenciaCliente: string | null;
  notas: string | null;
}

export function DetallesExpediente({
  expedienteId,
  referenciaCliente,
  notas,
}: DetallesExpedienteProps) {
  const [referencia, setReferencia] = useState(referenciaCliente ?? "");
  const [notasTexto, setNotasTexto] = useState(notas ?? "");
  const [guardado, setGuardado] = useState({
    referencia: referenciaCliente ?? "",
    notas: notas ?? "",
  });
  const [saving, setSaving] = useState(false);

  const dirty = referencia !== guardado.referencia || notasTexto !== guardado.notas;

  const handleGuardar = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/expedientes/${expedienteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referencia_cliente: referencia.trim() || null,
          notas: notasTexto.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setGuardado({ referencia, notas: notasTexto });
      toast.success("Cambios guardados correctamente.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
        <Pencil size={12} aria-hidden />
        Cliente y notas
      </p>

      <label className="mb-3 block">
        <div className="mb-1.5 flex justify-between text-xs font-medium text-text-secondary">
          <span>Referencia de cliente</span>
          <span className={referencia.length >= 120 ? "text-warning-dark" : ""}>{referencia.length}/120</span>
        </div>
        <input
          value={referencia}
          onChange={(e) => setReferencia(e.target.value)}
          maxLength={120}
          placeholder="Ej: Comunidad Calle Feria 12"
          className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary/70 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/15"
        />
      </label>

      <label className="block">
        <div className="mb-1.5 flex justify-between text-xs font-medium text-text-secondary">
          <span>Notas internas</span>
          <span className={notasTexto.length >= 4000 ? "text-warning-dark" : ""}>{notasTexto.length}/4000</span>
        </div>
        <textarea
          value={notasTexto}
          onChange={(e) => setNotasTexto(e.target.value)}
          maxLength={4000}
          rows={3}
          placeholder="Incidencias, contactos, subsanaciones…"
          className="w-full resize-none rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary/70 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/15"
        />
      </label>

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleGuardar}
          disabled={!dirty || saving}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark disabled:opacity-40 disabled:shadow-none"
        >
          {saving && <Loader2 size={12} className="animate-spin" aria-hidden />}
          Guardar
        </button>
      </div>
    </div>
  );
}
