"use client";

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type ExpedienteRow = {
  id: string;
  referencia: string;
  tipo_instalacion: string;
  estado: string;
  municipio: string;
  fecha_creacion: string;
};

type Props = {
  data: ExpedienteRow[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

const ESTADO_COLORES: Record<string, string> = {
  aprobado: "bg-success/10 text-success border-success/20",
  en_revision: "bg-warning/10 text-warning border-warning/20",
  subsanacion: "bg-danger/10 text-danger border-danger/20",
  presentado: "bg-primary/10 text-primary border-primary/20",
  borrador: "bg-border text-text-secondary",
};

export function StatsExpedientesTable({
  data,
  page,
  pageSize,
  total,
  onPageChange,
}: Props) {
  const columns: ColumnDef<ExpedienteRow>[] = [
    { accessorKey: "referencia", header: "Referencia" },
    { accessorKey: "tipo_instalacion", header: "Tecnología" },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={`text-[10px] ${ESTADO_COLORES[row.original.estado] ?? ""}`}
        >
          {row.original.estado.replace("_", " ")}
        </Badge>
      ),
    },
    { accessorKey: "municipio", header: "Municipio" },
    {
      accessorKey: "fecha_creacion",
      header: "Fecha",
      cell: ({ row }) =>
        new Date(row.original.fecha_creacion).toLocaleDateString("es-ES"),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / pageSize),
  });

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold text-text-primary">Expedientes Recientes</h3>
      </div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="text-xs">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-10 text-center text-sm text-text-secondary">
                No hay expedientes que mostrar.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-xs text-text-secondary">
            Página {page} de {totalPages} ({total} expedientes)
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="flex h-7 w-7 items-center justify-center rounded border border-border text-text-secondary transition hover:bg-bg disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="flex h-7 w-7 items-center justify-center rounded border border-border text-text-secondary transition hover:bg-bg disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
