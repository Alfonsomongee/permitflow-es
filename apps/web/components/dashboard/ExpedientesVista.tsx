"use client";

import { useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { ExpedientesTable } from "./ExpedientesTable";
import { ExpedientesKanban } from "./ExpedientesKanban";
import type { Expediente } from "./types";

/**
 * Alterna entre la tabla (búsqueda/filtro/orden, para revisar el detalle de
 * cada expediente) y el kanban por fase comercial (para ver de un vistazo
 * en qué punto de venta/tramitación está la cartera completa). Roadmap de
 * mejoras, PREM-02.
 */
export function ExpedientesVista({
  expedientes,
  initialQuery,
}: {
  expedientes: Expediente[];
  initialQuery: string;
}) {
  const [vista, setVista] = useState<"tabla" | "kanban">("tabla");

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
          <button
            onClick={() => setVista("tabla")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              vista === "tabla" ? "bg-primary-light text-primary-dark" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <List size={13} aria-hidden />
            Tabla
          </button>
          <button
            onClick={() => setVista("kanban")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              vista === "kanban" ? "bg-primary-light text-primary-dark" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <LayoutGrid size={13} aria-hidden />
            Kanban
          </button>
        </div>
      </div>

      {vista === "tabla" ? (
        <ExpedientesTable expedientes={expedientes} initialQuery={initialQuery} />
      ) : (
        <ExpedientesKanban expedientes={expedientes} />
      )}
    </div>
  );
}
