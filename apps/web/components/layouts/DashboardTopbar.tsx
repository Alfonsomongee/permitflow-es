"use client";

import { Search, Bell } from "lucide-react";
import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
  "/expedientes":       "Expedientes",
  "/nueva-instalacion": "Nueva instalación",
  "/plantillas":        "Plantillas",
  "/alertas":           "Alertas BOE",
  "/estadisticas":      "Estadísticas",
  "/ajustes":           "Ajustes",
};

export function DashboardTopbar() {
  const pathname = usePathname();

  // Busca la clave más específica que coincida con el pathname actual
  const title =
    Object.entries(PAGE_TITLES)
      .sort((a, b) => b[0].length - a[0].length)
      .find(([key]) => pathname.startsWith(key))?.[1] ?? "PermitFlow ES";

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
      <h1 className="text-sm font-medium text-text-primary">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Buscador global (decorativo en prototipo) */}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-1.5 text-xs text-text-secondary">
          <Search size={13} aria-hidden />
          <span>Buscar expediente…</span>
          <kbd className="ml-2 rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
            ⌘K
          </kbd>
        </div>

        {/* Notificaciones */}
        <button
          className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary hover:bg-bg transition-colors"
          aria-label="Notificaciones"
        >
          <Bell size={15} aria-hidden />
          {/* Punto rojo de alerta */}
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-danger" aria-hidden />
        </button>
      </div>
    </header>
  );
}
