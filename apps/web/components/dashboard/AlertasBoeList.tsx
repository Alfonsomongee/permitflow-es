"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, AlertTriangle, Trash2, CheckCircle2 } from "lucide-react";
import type { DbAlertaBoe } from "@/lib/supabase";

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
  const styles = TIPO_STYLES[alerta.tipo];
  const Icon = styles.icon;

  const fecha = new Date(alerta.creado_en).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      className={`rounded-xl border p-4 transition-opacity ${
        alerta.leida ? "opacity-60 border-border" : "border-border bg-surface shadow-sm"
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

            {/* Expedientes de la organización afectados por esta alerta */}
            {afectados.length > 0 && (
              <div className="flex w-full flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-medium text-warning-dark">
                  Afecta a {afectados.length} expediente{afectados.length !== 1 ? "s" : ""}:
                </span>
                {afectados.slice(0, 4).map((e) => (
                  <Link
                    key={e.id}
                    href={`/expedientes/${e.id}`}
                    className="rounded-full border border-warning/40 bg-warning-light px-2 py-0.5 text-[10px] text-warning-dark transition-colors hover:border-warning"
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
                className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-success transition-colors"
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
}: {
  alertas: DbAlertaBoe[];
  expedientesPorAlerta?: Record<string, ExpedienteAfectadoChip[]>;
}) {
  const [lista, setLista] = useState(alertas);

  const marcarLeida = async (id: string) => {
    // Optimistic update
    setLista((prev) =>
      prev.map((a) => (a.id === id ? { ...a, leida: true } : a))
    );
    // Persistir en Supabase vía API Route
    await fetch("/api/alertas/leer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  };

  const noLeidas = lista.filter((a) => !a.leida).length;

  if (lista.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
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
      {noLeidas > 0 && (
        <p className="mb-4 text-xs text-text-secondary">
          {noLeidas} alerta{noLeidas !== 1 ? "s" : ""} sin leer
        </p>
      )}
      <div className="flex flex-col gap-3">
        {lista.map((alerta) => (
          <AlertaItem
            key={alerta.id}
            alerta={alerta}
            onMarcarLeida={marcarLeida}
            afectados={expedientesPorAlerta[alerta.id]}
          />
        ))}
      </div>
    </div>
  );
}
