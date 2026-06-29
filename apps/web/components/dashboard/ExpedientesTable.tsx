"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Filter } from "lucide-react";
import {
  type Expediente,
  type EstadoExpediente,
  ESTADO_LABEL,
  ESTADO_STYLES,
  TIPO_LABEL,
  COMUNIDAD_LABEL,
} from "./types";

// ─── Badge de estado ──────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: EstadoExpediente }) {
  const styles = ESTADO_STYLES[estado];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${styles.bg} ${styles.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} aria-hidden />
      {ESTADO_LABEL[estado]}
    </span>
  );
}

// ─── Barra de progreso de trámites ────────────────────────────────────────────

function ProgressBar({
  completados,
  total,
}: {
  completados: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((completados / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-bg">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
          aria-label={`${completados} de ${total} trámites completados`}
        />
      </div>
      <span className="text-xs text-text-secondary">
        {completados}/{total}
      </span>
    </div>
  );
}

// ─── Filtro de estado ─────────────────────────────────────────────────────────

const FILTER_OPTIONS: { value: EstadoExpediente | "todos"; label: string }[] = [
  { value: "todos",      label: "Todos"       },
  { value: "pendiente",  label: "Pendiente"   },
  { value: "en_revision",label: "En revisión" },
  { value: "aprobado",   label: "Aprobado"    },
  { value: "borrador",   label: "Borrador"    },
  { value: "rechazado",  label: "Rechazado"   },
];

// ─── Tabla principal ──────────────────────────────────────────────────────────

interface ExpedientesTableProps {
  expedientes: Expediente[];
}

export function ExpedientesTable({ expedientes }: ExpedientesTableProps) {
  const [filtro, setFiltro] = useState<EstadoExpediente | "todos">("todos");

  const filtered =
    filtro === "todos"
      ? expedientes
      : expedientes.filter((e) => e.estado === filtro);

  function formatFecha(iso: string) {
    const d = new Date(iso);
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);

    if (d.toDateString() === hoy.toDateString()) return "Hoy";
    if (d.toDateString() === ayer.toDateString()) return "Ayer";
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  }

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Cabecera con filtros */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <p className="text-sm font-medium text-text-primary">
          {filtered.length}{" "}
          <span className="font-normal text-text-secondary">
            {filtered.length === 1 ? "expediente" : "expedientes"}
          </span>
        </p>

        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-text-secondary" aria-hidden />
          <div className="flex gap-1">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFiltro(opt.value)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  filtro === opt.value
                    ? "bg-primary text-white font-medium"
                    : "text-text-secondary hover:bg-bg"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {["Cliente / Dirección", "CC. AA.", "Tipo", "Progreso", "Estado", "Actualización", ""].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-text-secondary"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((exp) => (
              <tr
                key={exp.id}
                className="group hover:bg-bg transition-colors"
              >
                <td className="px-5 py-3.5">
                  <p className="text-sm font-medium text-text-primary">
                    {exp.cliente ?? exp.municipio}
                  </p>
                  <p className="text-xs text-text-secondary">{exp.municipio}</p>
                </td>
                <td className="px-5 py-3.5 text-sm text-text-secondary">
                  {COMUNIDAD_LABEL[exp.comunidad] ?? exp.comunidad}
                </td>
                <td className="px-5 py-3.5 text-sm text-text-secondary">
                  {TIPO_LABEL[exp.tipo_instalacion] ?? exp.tipo_instalacion}
                </td>
                <td className="px-5 py-3.5">
                  <ProgressBar
                    completados={exp.tramites_completados}
                    total={exp.tramites_total}
                  />
                </td>
                <td className="px-5 py-3.5">
                  <EstadoBadge estado={exp.estado} />
                </td>
                <td className="px-5 py-3.5 text-xs text-text-secondary">
                  {formatFecha(exp.fecha_actualizacion)}
                </td>
                <td className="px-5 py-3.5">
                  <Link
                    href={`/expedientes/${exp.id}`}
                    className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Ver plan <ArrowUpRight size={12} aria-hidden />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-text-secondary">
            No hay expedientes con estado «{ESTADO_LABEL[filtro as EstadoExpediente]}».
          </div>
        )}
      </div>
    </div>
  );
}
