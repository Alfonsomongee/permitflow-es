"use client";

import { Search, Menu } from "lucide-react";
import { useSidebar } from "./SidebarContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { useCommandPaletteStore } from "@/store/use-command-palette-store";

export function DashboardTopbar() {
  const { toggle } = useSidebar();
  const title = usePageTitle();
  const openPalette = useCommandPaletteStore((s) => s.toggle);

  return (
    <header className="flex h-[60px] flex-shrink-0 items-center justify-between border-b border-border bg-surface px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="rounded-md p-1.5 text-text-secondary hover:bg-bg hover:text-text-primary md:hidden outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Abrir menú"
        >
          <Menu size={18} />
        </button>
        <h1 className="text-sm font-semibold text-text-primary">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Buscador global (abre el Command Palette, ver layouts/CommandPalette.tsx) */}
        <button
          onClick={openPalette}
          className="hidden md:flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-1.5 text-xs text-text-secondary hover:border-primary/50 hover:bg-surface transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Buscar expediente o comando"
        >
          <Search size={14} aria-hidden />
          <span>Buscar expediente…</span>
          <kbd className="ml-2 rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] font-medium text-text-secondary shadow-sm">
            ⌘K
          </kbd>
        </button>

        {/* Buscador móvil (icono solo) */}
        <button
          onClick={openPalette}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary hover:bg-bg transition-colors md:hidden outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Buscar"
        >
          <Search size={15} aria-hidden />
        </button>

        {/* Notificaciones de plazos (real, ver components/dashboard/NotificationBell.tsx) */}
        <NotificationBell />
      </div>
    </header>
  );
}
