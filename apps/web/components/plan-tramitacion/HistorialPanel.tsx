"use client";

import { useEffect, useState } from "react";
import { ChevronDown, History, Loader2 } from "lucide-react";

interface EntradaHistorial {
  id: string;
  orden: number;
  estado_anterior: string | null;
  estado_nuevo: string;
  operador_id: string;
  creado_en: string;
}

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  completado: "Completado",
};

export function HistorialPanel({ expedienteId }: { expedienteId: string }) {
  const [entradas, setEntradas] = useState<EntradaHistorial[]>([]);
  const [usuarioActual, setUsuarioActual] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const res = await fetch(`/api/expedientes/${expedienteId}/historial`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          historial?: EntradaHistorial[];
          usuario_actual?: string;
        };
        if (!cancelado) {
          setEntradas(data.historial ?? []);
          setUsuarioActual(data.usuario_actual ?? null);
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [expedienteId]);

  // Sin actividad registrada: no mostramos un panel vacío.
  if (!cargando && entradas.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between"
        aria-expanded={abierto}
      >
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          <History size={12} aria-hidden />
          Actividad ({entradas.length})
        </span>
        {cargando ? (
          <Loader2 size={14} className="animate-spin text-text-secondary" aria-hidden />
        ) : (
          <ChevronDown
            size={14}
            className={`text-text-secondary transition-transform ${abierto ? "rotate-180" : ""}`}
            aria-hidden
          />
        )}
      </button>

      {abierto && (
        <ul className="mt-3 flex flex-col gap-2.5">
          {entradas.map((e) => {
            const fecha = new Date(e.creado_en).toLocaleDateString("es-ES", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });
            const esTuyo = usuarioActual !== null && e.operador_id === usuarioActual;
            return (
              <li key={e.id} className="text-xs leading-relaxed text-text-primary">
                <span className="font-medium">Trámite {e.orden}</span>
                {": "}
                {ESTADO_LABEL[e.estado_anterior ?? "pendiente"] ?? e.estado_anterior}
                {" → "}
                <span className="font-medium">
                  {ESTADO_LABEL[e.estado_nuevo] ?? e.estado_nuevo}
                </span>
                <span className="mt-0.5 block text-[10px] text-text-secondary">
                  {fecha}
                  {" · "}
                  {esTuyo ? "tú" : `operador …${e.operador_id.slice(-6)}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
