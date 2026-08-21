"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { FileText, AlertTriangle, Trash2, CheckCircle2, Filter, Sparkles, ShieldCheck, Briefcase } from "lucide-react";
import { toast } from "sonner";
import type { DbAlertaBoe } from "@/lib/supabase";

const URGENCIA_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  alta: { label: "Urgencia alta", bg: "bg-danger-light", text: "text-danger-dark" },
  media: { label: "Urgencia media", bg: "bg-warning-light", text: "text-warning-dark" },
  baja: { label: "Urgencia baja", bg: "bg-bg", text: "text-text-secondary" },
};

/** Distingue una hipótesis del pipeline IA (sin revisar) de un cambio que un
 * humano ya validó y aplicó al motor normativo (marcar_alerta_aplicada). Sin
 * esto, el cliente no puede saber si "Normativa nueva" es un hecho confirmado
 * o una sugerencia del LLM todavía en cola de revisión. */
function EstadoAplicacion({ aplicada }: { aplicada: boolean }) {
  if (aplicada) {
    return (
      <span className="flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
        <ShieldCheck size={11} aria-hidden />
        Verificada y aplicada al motor
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary-light px-2 py-0.5 text-[10px] font-medium text-primary-dark">
      <Sparkles size={11} aria-hidden />
      Sugerencia IA — pendiente de revisión
    </span>
  );
}

const TIPO_STYLES = {
  normativa_nueva: {
    label: "Normativa nueva",
    bg: "bg-primary-light",
    text: "text-primary-dark",
    icon: FileText,
  },
  modificacion: {
    label: "Modificación",
    bg: "bg-warning-light",
    text: "text-warning-dark",
    icon: AlertTriangle,
  },
  derogacion: {
    label: "Derogación",
    bg: "bg-danger-light",
    text: "text-danger-dark",
    icon: Trash2,
  },
} as const;

interface ExpedienteAfectadoChip {
  id: string;
  etiqueta: string;
}

function AlertaItem({
  alerta,
  onMarcarLeida,
  afectados = [],
}: {
  alerta: DbAlertaBoe;
  onMarcarLeida: (id: string) => void;
  afectados?: ExpedienteAfectadoChip[];
}) {
  const styles = TIPO_STYLES[alerta.tipo] || TIPO_STYLES.modificacion;
  const Icon = styles.icon;

  const fecha = new Date(alerta.creado_en).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        alerta.leida ? "opacity-60 border-border bg-bg/50" : "border-border bg-surface shadow-sm hover:shadow-md"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${styles.bg}`}
        >
          <Icon size={15} className={styles.text} aria-hidden />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-text-primary leading-snug">
              {alerta.titulo}
            </p>
            <span
              className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${styles.bg} ${styles.text}`}
            >
              {styles.label}
            </span>
          </div>

          {alerta.resumen && (
            <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">
              {alerta.resumen}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <EstadoAplicacion aplicada={alerta.aplicada} />
            {alerta.nivel_urgencia && URGENCIA_STYLES[alerta.nivel_urgencia] && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${URGENCIA_STYLES[alerta.nivel_urgencia].bg} ${URGENCIA_STYLES[alerta.nivel_urgencia].text}`}
              >
                {URGENCIA_STYLES[alerta.nivel_urgencia].label}
              </span>
            )}
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            {/* CCAA afectadas */}
            {alerta.ccaa_afectadas && alerta.ccaa_afectadas.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {alerta.ccaa_afectadas.map((ccaa) => (
                  <span
                    key={ccaa}
                    className="rounded-full border border-border bg-bg px-2 py-0.5 text-[10px] text-text-secondary"
                  >
                    {ccaa}
                  </span>
                ))}
              </div>
            )}

            {/* Verticales afectados */}
            {alerta.verticales_afectados && alerta.verticales_afectados.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {alerta.verticales_afectados.map((v) => (
                  <span
                    key={v}
                    className="rounded-full border border-primary/20 bg-primary-light px-2 py-0.5 text-[10px] text-primary"
                  >
                    {v}
                  </span>
                ))}
              </div>
            )}

            {/* Expedientes afectados */}
            {afectados.length > 0 && (
              <div className="flex w-full flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-medium text-warning-dark">
                  Afecta a {afectados.length} expediente{afectados.length !== 1 ? "s" : ""}:
                </span>
                {afectados.slice(0, 4).map((e) => (
                  <Link
                    key={e.id}
                    href={`/expedientes/${e.id}`}
                    className="rounded-full border border-warning/40 bg-warning-light px-2 py-0.5 text-[10px] text-warning-dark transition-colors hover:border-warning hover:bg-warning/20"
                  >
                    {e.etiqueta}
                  </Link>
                ))}
                {afectados.length > 4 && (
                  <span className="text-[10px] text-text-secondary">
                    +{afectados.length - 4} más
                  </span>
                )}
              </div>
            )}

            <span className="text-[11px] text-text-secondary ml-auto">{fecha}</span>

            {/* Enlace BOE */}
            {alerta.fuente_url && (
              <a
                href={alerta.fuente_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-primary hover:underline"
              >
                Ver en BOE →
              </a>
            )}

            {/* Marcar como leída */}
            {!alerta.leida && (
              <button
                onClick={() => onMarcarLeida(alerta.id)}
                className="flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] text-text-secondary hover:bg-success hover:text-white transition-colors"
              >
                <CheckCircle2 size={12} aria-hidden />
                Marcar leída
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AlertasBoeList({
  alertas,
  expedientesPorAlerta = {},
  relevantesCartera,
  hayCartera = false,
}: {
  alertas: DbAlertaBoe[];
  expedientesPorAlerta?: Record<string, ExpedienteAfectadoChip[]>;
  /** Ids de alertas.ts::alertaRelevanteParaCartera para esta organización. */
  relevantesCartera?: Set<string>;
  /** false si la organización todavía no tiene ningún expediente: sin
   * cartera no hay nada real que filtrar, así que el toggle no se muestra. */
  hayCartera?: boolean;
}) {
  const [lista, setLista] = useState(alertas);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroCcaa, setFiltroCcaa] = useState<string>("todas");
  const [filtroVertical, setFiltroVertical] = useState<string>("todos");
  const [filtroUrgencia, setFiltroUrgencia] = useState<string>("todas");
  // Por defecto solo se ven las alertas relevantes para la cartera propia --
  // origen: roadmap de mejoras, QW-02. El usuario puede desactivarlo para
  // ver el radar normativo completo.
  const [soloCartera, setSoloCartera] = useState(true);
  const [marcandoTodas, setMarcandoTodas] = useState(false);

  const marcarLeida = async (id: string) => {
    // Optimistic update
    setLista((prev) =>
      prev.map((a) => (a.id === id ? { ...a, leida: true } : a))
    );
    toast.success("Alerta marcada como leída");

    try {
      await fetch("/api/alertas/leer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      toast.error("Error al guardar en el servidor");
    }
  };

  const marcarTodasLeidas = async () => {
    const pendientes = lista.filter((a) => !a.leida).map((a) => a.id);
    if (pendientes.length === 0) return;

    setMarcandoTodas(true);
    // Optimistic update
    setLista((prev) => prev.map((a) => ({ ...a, leida: true })));

    try {
      const resultados = await Promise.allSettled(
        pendientes.map((id) =>
          fetch("/api/alertas/leer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          })
        )
      );
      const fallidas = resultados.filter((r) => r.status === "rejected").length;
      if (fallidas > 0) {
        toast.error(`${fallidas} alerta${fallidas !== 1 ? "s" : ""} no se pudo marcar como leída`);
      } else {
        toast.success("Todas las alertas marcadas como leídas");
      }
    } finally {
      setMarcandoTodas(false);
    }
  };

  const ccaaDisponibles = useMemo(() => {
    const set = new Set<string>();
    lista.forEach((a) => a.ccaa_afectadas?.forEach((c) => set.add(c)));
    return Array.from(set).sort();
  }, [lista]);

  const verticalesDisponibles = useMemo(() => {
    const set = new Set<string>();
    lista.forEach((a) => a.verticales_afectados?.forEach((v) => set.add(v)));
    return Array.from(set).sort();
  }, [lista]);

  const listaFiltrada = useMemo(() => {
    return lista.filter((a) => {
      if (soloCartera && hayCartera && relevantesCartera && !relevantesCartera.has(a.id)) {
        return false;
      }
      if (filtroTipo !== "todos" && a.tipo !== filtroTipo) return false;
      if (filtroCcaa !== "todas" && !(a.ccaa_afectadas ?? []).includes(filtroCcaa)) return false;
      if (filtroVertical !== "todos" && !(a.verticales_afectados ?? []).includes(filtroVertical)) return false;
      if (filtroUrgencia !== "todas" && a.nivel_urgencia !== filtroUrgencia) return false;
      return true;
    });
  }, [lista, filtroTipo, filtroCcaa, filtroVertical, filtroUrgencia, soloCartera, hayCartera, relevantesCartera]);

  const ocultasPorCartera =
    soloCartera && hayCartera && relevantesCartera
      ? lista.filter((a) => !relevantesCartera.has(a.id)).length
      : 0;

  const noLeidas = lista.filter((a) => !a.leida).length;

  if (lista.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface py-20 text-center shadow-sm">
        <CheckCircle2 size={32} className="text-success mb-3" aria-hidden />
        <p className="text-sm font-medium text-text-primary">Todo al día</p>
        <p className="mt-1 text-xs text-text-secondary">
          El pipeline BOE no ha detectado cambios normativos recientes.
        </p>
      </div>
    );
  }

  return (
    <div>
      {hayCartera && relevantesCartera && (
        <button
          onClick={() => setSoloCartera((v) => !v)}
          className={`mb-3 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
            soloCartera
              ? "border-primary/30 bg-primary-light text-primary-dark"
              : "border-border bg-surface text-text-secondary hover:border-primary/30"
          }`}
        >
          <Briefcase size={13} aria-hidden className="flex-shrink-0" />
          <span className="flex-1">
            {soloCartera
              ? `Mostrando solo lo relevante para tu cartera${ocultasPorCartera > 0 ? ` (${ocultasPorCartera} ocultas)` : ""}`
              : "Mostrando todas las alertas del pipeline BOE"}
          </span>
          <span className="flex-shrink-0 font-medium underline-offset-2 hover:underline">
            {soloCartera ? "Ver todas" : "Solo mi cartera"}
          </span>
        </button>
      )}

      <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        {noLeidas > 0 ? (
          <p className="text-xs text-text-secondary">
            <strong className="font-semibold text-text-primary">{noLeidas}</strong> alerta{noLeidas !== 1 ? "s" : ""} sin leer
          </p>
        ) : (
          <p className="text-xs text-text-secondary">Todas las alertas leídas</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Filter size={14} className="text-text-secondary" />
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          >
            <option value="todos">Todos los tipos</option>
            <option value="normativa_nueva">Normativa nueva</option>
            <option value="modificacion">Modificación</option>
            <option value="derogacion">Derogación</option>
          </select>

          {ccaaDisponibles.length > 0 && (
            <select
              value={filtroCcaa}
              onChange={(e) => setFiltroCcaa(e.target.value)}
              className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            >
              <option value="todas">Todas las CCAA</option>
              {ccaaDisponibles.map((ccaa) => (
                <option key={ccaa} value={ccaa}>{ccaa}</option>
              ))}
            </select>
          )}

          {verticalesDisponibles.length > 0 && (
            <select
              value={filtroVertical}
              onChange={(e) => setFiltroVertical(e.target.value)}
              className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            >
              <option value="todos">Todos los verticales</option>
              {verticalesDisponibles.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          )}

          <select
            value={filtroUrgencia}
            onChange={(e) => setFiltroUrgencia(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          >
            <option value="todas">Cualquier urgencia</option>
            <option value="alta">Urgencia alta</option>
            <option value="media">Urgencia media</option>
            <option value="baja">Urgencia baja</option>
          </select>

          {noLeidas > 0 && (
            <button
              onClick={marcarTodasLeidas}
              disabled={marcandoTodas}
              className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-success hover:text-white disabled:opacity-50"
            >
              <CheckCircle2 size={12} aria-hidden />
              Marcar todas leídas
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {listaFiltrada.length > 0 ? (
          listaFiltrada.map((alerta) => (
            <AlertaItem
              key={alerta.id}
              alerta={alerta}
              onMarcarLeida={marcarLeida}
              afectados={expedientesPorAlerta[alerta.id]}
            />
          ))
        ) : (
          <p className="py-10 text-center text-sm text-text-secondary">
            No hay alertas que coincidan con los filtros.
          </p>
        )}
      </div>
    </div>
  );
}
