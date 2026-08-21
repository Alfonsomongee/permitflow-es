"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface EliminarExpedienteButtonProps {
  expedienteId: string;
  titulo?: string;
}

/**
 * Borrado de expediente: acción destructiva e irreversible (no hay papelera
 * ni soft-delete todavía -- eliminarExpediente() en lib/expedientes.ts hace
 * un DELETE real en Supabase). eliminarExpediente() existía desde hace
 * tiempo sin ninguna ruta ni botón que la invocara (plan de acción
 * consolidado 2026-08-12, P-19).
 *
 * Confirmación en dos pasos dentro del propio botón en vez de un modal: con
 * solo esta acción destructiva en toda la página no compensa introducir un
 * sistema de diálogos nuevo solo para esto.
 */
export function EliminarExpedienteButton({ expedienteId, titulo }: EliminarExpedienteButtonProps) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const eliminar = async () => {
    setEliminando(true);
    try {
      const res = await fetch(`/api/expedientes/${expedienteId}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      toast.success("Expediente eliminado.");
      router.push("/expedientes");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar el expediente.");
      setEliminando(false);
      setConfirmando(false);
    }
  };

  if (confirmando) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-danger bg-danger-light px-3 py-2">
        <span className="text-xs font-medium text-danger-dark">
          ¿Eliminar {titulo ? `"${titulo}"` : "este expediente"}? No se puede deshacer.
        </span>
        <button
          onClick={eliminar}
          disabled={eliminando}
          className="flex items-center gap-1 rounded-lg bg-danger px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-danger-dark disabled:opacity-50"
        >
          {eliminando ? <Loader2 size={12} className="animate-spin" aria-hidden /> : null}
          Sí, eliminar
        </button>
        <Button variant="outline" size="xs" onClick={() => setConfirmando(false)} disabled={eliminando}>
          <X size={12} aria-hidden />
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirmando(true)}
      className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-text-primary shadow-sm transition-colors hover:border-danger hover:text-danger"
      aria-label="Eliminar expediente"
    >
      <Trash2 size={13} aria-hidden />
      Eliminar
    </button>
  );
}
