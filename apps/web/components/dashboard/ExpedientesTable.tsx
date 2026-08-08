"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Filter, Plus, Search, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
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
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-gradient-primary transition-all duration-300 ease-smooth"
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
  /** Prefiltra la búsqueda (ej. viniendo de un enlace desde /plantillas para
   * un tipo de instalación concreto). El usuario puede seguir editándola. */
  initialQuery?: string;
}

export function ExpedientesTable({ expedientes, initialQuery = "" }: ExpedientesTableProps) {
  const [filtro, setFiltro] = useState<EstadoExpediente | "todos">("todos");
  const [comunidadFiltro, setComunidadFiltro] = useState<string>("todas");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [query, setQuery] = useState(initialQuery);
  const [sorting, setSorting] = useState<SortingState>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Atajo '/' para saltar directo a la búsqueda sin usar el ratón, útil para
  // gestorías que revisan muchos expedientes al día (mejora 2026-08-08).
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Antes solo se podía filtrar por estado (chips) o buscar comunidad/tipo
  // escribiendo el texto exacto -- con muchos expedientes activos pesa no
  // tener desplegables dedicados (mejora 2026-08-07).
  const comunidadesDisponibles = useMemo(() => {
    const set = new Set(expedientes.map((e) => e.comunidad));
    return Array.from(set).sort();
  }, [expedientes]);

  const tiposDisponibles = useMemo(() => {
    const set = new Set(expedientes.map((e) => e.tipo_instalacion));
    return Array.from(set).sort();
  }, [expedientes]);

  // Filtrado customizado antes de pasarlo a TanStack (más fácil para multi-campos)
  const filteredData = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return expedientes.filter((expediente) => {
      const matchesEstado = filtro === "todos" || expediente.estado === filtro;
      const matchesComunidad = comunidadFiltro === "todas" || expediente.comunidad === comunidadFiltro;
      const matchesTipo = tipoFiltro === "todos" || expediente.tipo_instalacion === tipoFiltro;
      const searchable = [
        expediente.cliente,
        TIPO_LABEL[expediente.tipo_instalacion],
        expediente.tipo_instalacion,
        COMUNIDAD_LABEL[expediente.comunidad],
        expediente.comunidad,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        matchesEstado &&
        matchesComunidad &&
        matchesTipo &&
        (!normalizedQuery || searchable.includes(normalizedQuery))
      );
    });
  }, [expedientes, filtro, comunidadFiltro, tipoFiltro, query]);

  const columns: ColumnDef<Expediente>[] = useMemo(
    () => [
      {
        accessorKey: "cliente",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-text-primary"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Cliente / Referencia
            <ArrowUpDown size={12} />
          </button>
        ),
        cell: ({ row }) => (
          <p className="font-medium text-text-primary">
            {row.original.cliente ?? "Sin referencia"}
          </p>
        ),
      },
      {
        accessorKey: "comunidad",
        header: "CC. AA.",
        cell: ({ row }) => (
          <span className="text-text-secondary">
            {COMUNIDAD_LABEL[row.original.comunidad] ?? row.original.comunidad}
          </span>
        ),
      },
      {
        accessorKey: "tipo_instalacion",
        header: "Tipo",
        cell: ({ row }) => (
          <span className="text-text-secondary">
            {TIPO_LABEL[row.original.tipo_instalacion] ?? row.original.tipo_instalacion}
          </span>
        ),
      },
      {
        id: "progreso",
        header: "Progreso",
        cell: ({ row }) => (
          <ProgressBar
            completados={row.original.tramites_completados}
            total={row.original.tramites_total}
          />
        ),
      },
      {
        accessorKey: "estado",
        header: "Estado",
        cell: ({ row }) => <EstadoBadge estado={row.original.estado} />,
      },
      {
        accessorKey: "fecha_actualizacion",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-text-primary"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Actualización
            <ArrowUpDown size={12} />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-text-secondary">
            {formatFecha(row.original.fecha_actualizacion)}
          </span>
        ),
      },
      {
        id: "acciones",
        header: "",
        cell: ({ row }) => (
          <Link
            href={`/expedientes/${row.original.id}`}
            className="flex items-center gap-1 text-primary opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100"
          >
            Ver plan <ArrowUpRight size={12} aria-hidden />
          </Link>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const hasFilters =
    filtro !== "todos" ||
    comunidadFiltro !== "todas" ||
    tipoFiltro !== "todos" ||
    query.trim() !== "";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-text-primary">
            {filteredData.length}{" "}
            <span className="font-normal text-text-secondary">
              {filteredData.length === 1 ? "expediente" : "expedientes"}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">
            Busca por cliente, comunidad o tipo de instalación.
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
              ref={searchInputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar..."
              className="h-9 w-full rounded-lg border border-border bg-bg pl-9 pr-9 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary/20 sm:w-64"
            />
            {!query && (
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
                /
              </kbd>
            )}
          </label>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <Filter size={13} className="flex-shrink-0 text-text-secondary" aria-hidden />
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setFiltro(option.value)}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs transition-all duration-150 ease-smooth ${
                  filtro === option.value
                    ? "bg-gradient-primary font-medium text-white shadow-xs"
                    : "text-text-secondary hover:bg-bg"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {comunidadesDisponibles.length > 1 && (
            <Select value={comunidadFiltro} onValueChange={(v) => setComunidadFiltro(v as string)}>
              <SelectTrigger className="min-w-[9.5rem]">
                <SelectValue placeholder="Todas las CC. AA." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las CC. AA.</SelectItem>
                {comunidadesDisponibles.map((c) => (
                  <SelectItem key={c} value={c}>{COMUNIDAD_LABEL[c] ?? c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {tiposDisponibles.length > 1 && (
            <Select value={tipoFiltro} onValueChange={(v) => setTipoFiltro(v as string)}>
              <SelectTrigger className="min-w-[8.5rem]">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                {tiposDisponibles.map((t) => (
                  <SelectItem key={t} value={t}>{TIPO_LABEL[t] ?? t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {filteredData.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-transparent">
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="h-10 text-[11px] font-medium uppercase tracking-wider text-text-secondary"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="group transition-colors hover:bg-bg/50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3.5 text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {table.getPageCount() > 1 && (
            <div className="flex items-center justify-between border-t border-border px-5 py-3">
              <p className="text-xs text-text-secondary">
                Mostrando {table.getRowModel().rows.length} de {filteredData.length} expedientes
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-bg disabled:opacity-50"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-bg disabled:opacity-50"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <p className="text-sm font-medium text-text-primary">
            {hasFilters ? "No hay expedientes con esos filtros" : "Aún no hay expedientes"}
          </p>
          <p className="mt-1 max-w-md text-sm text-text-secondary">
            {hasFilters
              ? "Prueba a cambiar la búsqueda o el estado seleccionado."
              : "Genera tu primer plan de tramitación para empezar a organizar documentos, plazos y organismos."}
          </p>
          {!hasFilters && (
            <Link
              href="/nueva-instalacion"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
            >
              <Plus size={15} aria-hidden />
              Nueva instalación
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
