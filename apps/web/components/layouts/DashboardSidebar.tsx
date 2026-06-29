"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Plus,
  FileText,
  Bell,
  BarChart2,
  Settings,
  Zap,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/expedientes",         label: "Expedientes",   icon: LayoutGrid },
  { href: "/nueva-instalacion",   label: "Nueva",         icon: Plus        },
  { href: "/plantillas",          label: "Plantillas",    icon: FileText    },
  { href: "/alertas",             label: "Alertas BOE",   icon: Bell        },
  { href: "/estadisticas",        label: "Estadísticas",  icon: BarChart2   },
] as const;

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-[220px] flex-shrink-0 flex-col border-r border-border bg-surface">
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
          <Zap size={14} className="text-white" aria-hidden />
        </div>
        <span className="text-sm font-medium text-text-primary tracking-tight">
          PermitFlow <span className="text-primary font-semibold">ES</span>
        </span>
      </div>

      {/* Navegación principal */}
      <nav className="flex-1 px-3 py-4" aria-label="Navegación principal">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`
                    flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors
                    ${isActive
                      ? "bg-primary-light text-primary font-medium"
                      : "text-text-secondary hover:bg-bg hover:text-text-primary"
                    }
                  `}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon size={16} aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Ajustes al fondo */}
      <div className="border-t border-border px-3 py-3">
        <Link
          href="/ajustes"
          className={`
            flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors
            ${pathname === "/ajustes"
              ? "bg-primary-light text-primary font-medium"
              : "text-text-secondary hover:bg-bg hover:text-text-primary"
            }
          `}
        >
          <Settings size={16} aria-hidden />
          Ajustes
        </Link>

        {/* Indicador de empresa / cuenta */}
        <div className="mt-3 flex items-center gap-2.5 rounded-lg px-3 py-2.5">
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-light text-[10px] font-semibold text-primary">
            GE
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-text-primary">GreenEnergy SL</p>
            <p className="text-[11px] text-text-secondary">Plan Pro</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
