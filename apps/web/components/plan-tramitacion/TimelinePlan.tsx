"use client";

import { motion } from "framer-motion";
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
  return paralelo ? "bg-primary/50" : "bg-primary";
}

export function TimelinePlan({ tramites, estados = {}, tiempoSerie }: TimelinePlanProps) {
  if (tramites.length < 2) return null;

  const { slots, duracionCritica, duracionSerie } = calcularTimeline(tramites);
  const total = Math.max(duracionCritica, 1);
  const serie = tiempoSerie ?? duracionSerie;
  const ahorro = serie - duracionCritica;
  const marcas = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(total * f));

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          Línea temporal estimada
        </p>
        <p className="text-sm text-text-secondary">
          {ahorro > 0 ? (
            <>
              Camino crítico: <span className="font-semibold text-text-primary">{duracionCritica} días</span>
              {" · en serie: "}
              {serie} días{" · "}
              <span className="font-medium text-success-dark">−{ahorro}d por trámites en paralelo</span>
            </>
          ) : (
            <>
              <span className="font-semibold text-text-primary">{duracionCritica} días</span> en serie
            </>
          )}
        </p>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-0 flex justify-between">
          {marcas.map((_, i) => (
            <div key={i} className="h-full w-px bg-border/60" />
          ))}
        </div>

        <div className="relative flex flex-col gap-2.5">
          {slots.map((slot, idx) => {
            const left = (slot.inicioDia / total) * 100;
            const width = Math.max((slot.duracion / total) * 100, 2);
            const estado = estados[String(slot.orden)]?.estado;
            return (
              <motion.div
                key={slot.orden}
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-20px" }}
                transition={{
                  duration: 0.4,
                  delay: idx * 0.06,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <span className="w-28 flex-shrink-0 truncate text-xs text-text-secondary sm:w-44">
                  {slot.orden}. {slot.nombre}
                </span>
                <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-bg">
                  <motion.div
                    className={`absolute top-0 h-full rounded-full shadow-sm ${colorBarra(estado, slot.paralelo)}`}
                    style={{ left: `${left}%` }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${width}%` }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.6,
                      delay: idx * 0.06 + 0.2,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    title={`Día ${slot.inicioDia} → ${slot.finDia} (${slot.duracion}d)${slot.paralelo ? " · en paralelo" : ""}`}
                  />
                </div>
                <span className="w-9 flex-shrink-0 text-right text-xs font-medium tabular-nums text-text-secondary">
                  {slot.duracion}d
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex justify-between text-[10px] font-medium text-text-secondary">
        {marcas.map((m, i) => (
          <span key={i}>día {m}</span>
        ))}
      </div>
    </div>
  );
}
