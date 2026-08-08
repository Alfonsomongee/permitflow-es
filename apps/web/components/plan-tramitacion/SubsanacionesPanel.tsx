"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Clock, Loader2, Plus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import type { Tramite } from "@/types/plan";
import { diasEntre, hoyIso } from "@/lib/plazos";

interface Subsanacion {
  id: string;
  tramite_orden: number;
  tramite_nombre: string;
  descripcion: string;
  plazo_dias: number;
  fecha_inicio: string;
  fecha_limite: string;
  resuelta: boolean;
  resuelta_en: string | null;
  creado_por: string;
  creado_por_nombre: string | null;
  creado_en: string;
}

type Urgencia = "vencida" | "proxima" | "en_plazo" | "resuelta";

function urgenciaDe(s: Subsanacion): Urgencia {
  if (s.resuelta) return "resuelta";
  const diasRestantes = diasEntre(hoyIso(), s.fecha_limite);
  if (diasRestantes < 0) return "vencida";
  if (diasRestantes <= 5) return "proxima";
  return "en_plazo";
}

const ESTILO_URGENCIA: Record<Urgencia, string> = {
  vencida: "border-danger/40 bg-danger-light/40",
  proxima: "border-warning/40 bg-warning-light/40",
  en_plazo: "border-border bg-bg/40",
  resuelta: "border-border bg-bg/20 opacity-60",
};

function BadgePlazo({ s }: { s: Subsanacion }) {
  const urgencia = urgenciaDe(s);
  if (urgencia === "resuelta") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success-light px-2 py-0.5 text-[10px] font-semibold text-success-dark">
        <CheckCircle2 size={10} aria-hidden />
        Resuelta
      </span>
    );
  }
  const diasRestantes = diasEntre(hoyIso(), s.fecha_limite);
  const texto = diasRestantes < 0
    ? `vencida hace ${Math.abs(diasRestantes)}d`
    : diasRestantes === 0
      ? "vence hoy"
      : `quedan ${diasRestantes}d`;
  const estilo = urgencia === "vencida" ? "bg-danger text-white" : urgencia === "proxima" ? "bg-warning text-white" : "bg-surface border border-border text-text-secondary";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm ${estilo}`}>
      {urgencia === "vencida" ? <AlertTriangle size={10} aria-hidden /> : <Clock size={10} aria-hidden />}
      {texto}
    </span>
  );
}

/**
 * Requerimientos de subsanación (2026-08-08): antes solo se podían anotar
 * en el campo de texto libre `notas` del expediente, sin plazo propio ni
 * asociación a un trámite -- "la causa nº1 de retraso" según el
 * brainstorming de producto. Panel abierto por defecto (a diferencia de
 * HistorialPanel/DocumentosClientePanel) porque es información accionable,
 * no solo un registro pasivo.
 */
export function SubsanacionesPanel({
  expedienteId,
  tramites,
}: {
  expedienteId: string;
  tramites: Tramite[];
}) {
  const [items, setItems] = useState<Subsanacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resolviendoId, setResolviendoId] = useState<string | null>(null);

  const [tramiteOrden, setTramiteOrden] = useState<number | "">(tramites[0]?.orden ?? "");
  const [descripcion, setDescripcion] = useState("");
  const [plazoDias, setPlazoDias] = useState(10);

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await fetch(`/api/expedientes/${expedienteId}/subsanaciones`);
      if (!res.ok) return;
      const data = (await res.json()) as { subsanaciones?: Subsanacion[] };
      setItems(data.subsanaciones ?? []);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expedienteId]);

  const pendientes = items.filter((s) => !s.resuelta);
  const vencidas = pendientes.filter((s) => urgenciaDe(s) === "vencida").length;

  const crear = async () => {
    if (tramiteOrden === "" || descripcion.trim().length < 5) {
      toast.error("Indica el trámite y una descripción de al menos 5 caracteres.");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch(`/api/expedientes/${expedienteId}/subsanaciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tramite_orden: tramiteOrden, descripcion: descripcion.trim(), plazo_dias: plazoDias }),
      });
      const data = (await res.json().catch(() => ({}))) as { subsanacion?: Subsanacion; error?: string };
      if (!res.ok || !data.subsanacion) throw new Error(data.error ?? `Error ${res.status}`);
      setItems((prev) => [data.subsanacion!, ...prev]);
      setDescripcion("");
      setPlazoDias(10);
      setMostrarForm(false);
      toast.success("Requerimiento registrado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo registrar.");
    } finally {
      setEnviando(false);
    }
  };

  const marcarResuelta = async (id: string) => {
    setResolviendoId(id);
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, resuelta: true, resuelta_en: new Date().toISOString() } : s)));
    try {
      const res = await fetch(`/api/expedientes/${expedienteId}/subsanaciones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resuelta: true }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("No se pudo marcar como resuelta.");
      cargar();
    } finally {
      setResolviendoId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between"
        aria-expanded={abierto}
      >
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          <ShieldAlert size={12} aria-hidden />
          Subsanaciones
          {pendientes.length > 0 && (
            <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${vencidas > 0 ? "bg-danger text-white" : "bg-warning text-white"}`}>
              {pendientes.length}
            </span>
          )}
        </span>
        {cargando ? (
          <Loader2 size={14} className="animate-spin text-text-secondary" aria-hidden />
        ) : (
          <ChevronDown size={14} className={`text-text-secondary transition-transform ${abierto ? "rotate-180" : ""}`} aria-hidden />
        )}
      </button>

      {abierto && !cargando && (
        <div className="mt-3 space-y-2.5">
          {items.length === 0 && (
            <p className="text-xs text-text-secondary">Sin requerimientos de subsanación registrados.</p>
          )}

          {items.map((s) => (
            <div key={s.id} className={`rounded-lg border px-2.5 py-2 ${ESTILO_URGENCIA[urgenciaDe(s)]}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-text-primary">Trámite {s.tramite_orden}: {s.tramite_nombre}</p>
                <BadgePlazo s={s} />
              </div>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">{s.descripcion}</p>
              <div className="mt-1.5 flex items-center justify-between">
                <p className="text-[10px] text-text-secondary">
                  {s.creado_por_nombre ?? `usuario …${s.creado_por.slice(-6)}`} · plazo de {s.plazo_dias}d hábiles
                </p>
                {!s.resuelta && (
                  <button
                    onClick={() => marcarResuelta(s.id)}
                    disabled={resolviendoId === s.id}
                    className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline disabled:opacity-50"
                  >
                    <CheckCircle2 size={11} aria-hidden />
                    Marcar resuelta
                  </button>
                )}
              </div>
            </div>
          ))}

          {mostrarForm ? (
            <div className="space-y-2 rounded-lg border border-dashed border-border p-2.5">
              <select
                value={tramiteOrden}
                onChange={(e) => setTramiteOrden(Number(e.target.value))}
                className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-text-primary"
              >
                {tramites.map((t) => (
                  <option key={t.orden} value={t.orden}>
                    Trámite {t.orden}: {t.nombre}
                  </option>
                ))}
              </select>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Qué ha pedido corregir la administración…"
                className="min-h-[60px] w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-text-primary"
              />
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-text-secondary">Plazo (días hábiles)</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={plazoDias}
                  onChange={(e) => setPlazoDias(Number(e.target.value))}
                  className="w-16 rounded-md border border-border bg-surface px-2 py-1 text-xs text-text-primary"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={crear}
                  disabled={enviando}
                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
                >
                  {enviando && <Loader2 size={11} className="animate-spin" aria-hidden />}
                  Registrar
                </button>
                <button
                  onClick={() => setMostrarForm(false)}
                  className="text-[11px] text-text-secondary hover:text-text-primary"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setMostrarForm(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-[11px] font-medium text-text-secondary hover:border-primary hover:text-primary"
            >
              <Plus size={12} aria-hidden />
              Registrar requerimiento de subsanación
            </button>
          )}
        </div>
      )}
    </div>
  );
}
