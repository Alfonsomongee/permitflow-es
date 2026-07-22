"use client";

import { useState } from "react";
import { Check, Loader2, Pencil } from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const dirty =
    referencia !== guardado.referencia || notasTexto !== guardado.notas;

  const handleGuardar = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    setOk(false);
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
      setOk(true);
      setTimeout(() => setOk(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
        <Pencil size={11} aria-hidden />
        Cliente y notas
      </p>

      <label className="mb-3 block">
        <span className="mb-1 block text-xs text-text-secondary">
          Referencia de cliente
        </span>
        <input
          value={referencia}
          onChange={(e) => setReferencia(e.target.value)}
          maxLength={120}
          placeholder="Ej: Comunidad Calle Feria 12"
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary/20"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-text-secondary">
          Notas internas
        </span>
        <textarea
          value={notasTexto}
          onChange={(e) => setNotasTexto(e.target.value)}
          maxLength={4000}
          rows={3}
          placeholder="Incidencias, contactos, subsanaciones…"
          className="w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary/20"
        />
      </label>

      {error && <p className="mt-2 text-xs text-danger-dark">{error}</p>}

      <div className="mt-3 flex items-center justify-end gap-2">
        {ok && (
          <span className="flex items-center gap-1 text-xs text-success-dark">
            <Check size={12} aria-hidden /> Guardado
          </span>
        )}
        <button
          onClick={handleGuardar}
          disabled={!dirty || saving}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {saving && <Loader2 size={12} className="animate-spin" aria-hidden />}
          Guardar
        </button>
      </div>
    </div>
  );
}
