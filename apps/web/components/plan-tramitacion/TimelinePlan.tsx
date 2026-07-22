"use client";

import type { Tramite, TramitesEstadoMap } from "@/types/plan";
import { calcularTimeline } from "@/lib/timeline";

interface TimelinePlanProps {
  tramites: Tramite[];
  estados?: TramitesEstadoMap;
  tiempoSerie?: number | null;
}

function colorBarra(estado?: string, paralelo?: boolean) {
  if (estado === "completado") return "bg-success";
  if (estado === "en_curso") return "bg-warning";
  return paralelo ? "bg-primary/50" : "bg-primary/80";
}

export function TimelinePlan({ tramites, estados = {}, tiempoSerie }: TimelinePlanProps) {
  if (tramites.length < 2) return null;

  const { slots, duracionCritica, duracionSerie } = calcularTimeline(tramites);
  const total = Math.max(duracionCritica, 1);
  const serie = tiempoSerie ?? duracionSerie;
  const ahorro = serie - duracionCritica;

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
          Línea temporal estimada
        </p>
        <p className="text-xs text-text-secondary">
          {ahorro > 0 ? (
            <>
              Camino crítico:{" "}
              <span className="font-medium text-text-primary">{duracionCritica} días</span>
              {" · en serie: "}{serie} días{" · "}
              <span className="text-success-dark">−{ahorro}d por trámites en paralelo</span>
            </>
          ) : (
            <>
              <span className="font-medium text-text-primary">{duracionCritica} días</span>
              {" en serie"}
            </>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        {slots.map((slot) => {
          const left = (slot.inicioDia / total) * 100;
          const width = Math.max((slot.duracion / total) * 100, 1.5);
          const estado = estados[String(slot.orden)]?.estado;
          return (
            <div key={slot.orden} className="flex items-center gap-2">
              <span className="w-32 flex-shrink-0 truncate text-[10px] text-text-secondary sm:w-44">
                {slot.orden}. {slot.nombre}
              </span>
              <div className="relative h-3.5 flex-1 overflow-hidden rounded-full bg-bg">
                <div
                  className={`absolute top-0 h-full rounded-full ${colorBarra(estado, slot.paralelo)}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={`Día ${slot.inicioDia} → ${slot.finDia} (${slot.duracion}d)${
                    slot.paralelo ? " · en paralelo" : ""
                  }`}
                />
              </div>
              <span className="w-10 flex-shrink-0 text-right text-[10px] tabular-nums text-text-secondary">
                {slot.duracion}d
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex justify-between text-[10px] text-text-secondary">
        <span>Día 0</span>
        <span>Día {duracionCritica}</span>
      </div>
    </div>
  );
}
