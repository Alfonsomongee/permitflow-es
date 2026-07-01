"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Filter, Plus, Search } from "lucide-react";
import {
  type Expediente,
  type EstadoExpediente,
  COMUNIDAD_LABEL,
  ESTADO_LABEL,
  ESTADO_STYLES,
  TIPO_LABEL,
} from "./types";

const FILTER_OPTIONS: { value: EstadoExpediente | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "pendiente", label: "Pendiente" },
  { value: "en_revision", label: "En revision" },
  { value: "aprobado", label: "Aprobado" },
  { value: "borrador", label: "Borrador" },
  { value: "rechazado", label: "Rechazado" },
];

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
          aria-label={`${completados} de ${total} tramites completados`}
        />
      </div>
      <span className="text-xs text-text-secondary">
        {completados}/{total}
      </span>
    </div>
  );
}

function formatFecha(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Hoy";
  if (date.toDateString() === yesterday.toDateString()) return "Ayer";
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

interface ExpedientesTableProps {
  expedientes: Expediente[];
}

export function ExpedientesTable({ expedientes }: ExpedientesTableProps) {
  const [filtro, setFiltro] = useState<EstadoExpediente | "todos">("todos");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return expedientes.filter((expediente) => {
      const matchesEstado = filtro === "todos" || expediente.estado === filtro;
      const searchable = [
        expediente.cliente,
        expediente.municipio,
        TIPO_LABEL[expediente.tipo_instalacion],
        expediente.tipo_instalacion,
        COMUNIDAD_LABEL[expediente.comunidad],
        expediente.comunidad,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesEstado && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [expedientes, filtro, query]);

  const hasFilters = filtro !== "todos" || query.trim() !== "";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-text-primary">
            {filtered.length}{" "}
            <span className="font-normal text-text-secondary">
              {filtered.length === 1 ? "expediente" : "expedientes"}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">
            Busca por cliente, municipio, comunidad o tipo de instalacion.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative block">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              aria-hidden
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar"
              className="h-9 w-full rounded-lg border border-border bg-bg pl-9 pr-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary/20 sm:w-64"
            />
          </label>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <Filter size={13} className="flex-shrink-0 text-text-secondary" aria-hidden />
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setFiltro(option.value)}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs transition-colors ${
                  filtro === option.value
                    ? "bg-primary font-medium text-white"
                    : "text-text-secondary hover:bg-bg"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Cliente / municipio", "CC. AA.", "Tipo", "Progreso", "Estado", "Actualizacion", ""].map((heading) => (
                  <th
                    key={heading}
                    className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-text-secondary"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((expediente) => (
                <tr key={expediente.id} className="group transition-colors hover:bg-bg">
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-text-primary">
                      {expediente.cliente ?? expediente.municipio}
                    </p>
                    <p className="text-xs text-text-secondary">{expediente.municipio}</p>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-text-secondary">
                    {COMUNIDAD_LABEL[expediente.comunidad] ?? expediente.comunidad}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-text-secondary">
                    {TIPO_LABEL[expediente.tipo_instalacion] ?? expediente.tipo_instalacion}
                  </td>
                  <td className="px-5 py-3.5">
                    <ProgressBar
                      completados={expediente.tramites_completados}
                      total={expediente.tramites_total}
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <EstadoBadge estado={expediente.estado} />
                  </td>
                  <td className="px-5 py-3.5 text-xs text-text-secondary">
                    {formatFecha(expediente.fecha_actualizacion)}
                  </td>
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/expedientes/${expediente.id}`}
                      className="flex items-center gap-1 text-xs text-primary opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100"
                    >
                      Ver plan <ArrowUpRight size={12} aria-hidden />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <p className="text-sm font-medium text-text-primary">
            {hasFilters ? "No hay expedientes con esos filtros" : "Aun no hay expedientes"}
          </p>
          <p className="mt-1 max-w-md text-sm text-text-secondary">
            {hasFilters
              ? "Prueba a cambiar la busqueda o el estado seleccionado."
              : "Genera tu primer plan de tramitacion para empezar a organizar documentos, plazos y organismos."}
          </p>
          {!hasFilters && (
            <Link
              href="/nueva-instalacion"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <Plus size={15} aria-hidden />
              Nueva instalacion
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
