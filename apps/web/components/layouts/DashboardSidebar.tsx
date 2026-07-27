"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Plus,
  Compass,
  FileText,
  Bell,
  BarChart2,
  Settings,
  Zap,
  Calculator,
  X,
} from "lucide-react";
import { SidebarUser } from "./SidebarUser";
import { useSidebar } from "./SidebarContext";

const NAV_ITEMS = [
  { href: "/expedientes",         label: "Expedientes",   icon: LayoutGrid },
  { href: "/nueva-instalacion",   label: "Nueva",         icon: Plus        },
  { href: "/orientacion",         label: "Orientación",   icon: Compass     },
  { href: "/plantillas",          label: "Plantillas",    icon: FileText    },
  { href: "/alertas",             label: "Alertas BOE",   icon: Bell        },
  { href: "/estadisticas",        label: "Estadísticas",  icon: BarChart2   },
  { href: "/simulador",           label: "Simulador AI",  icon: Calculator  },
] as const;

export function DashboardSidebar() {
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r border-border bg-surface transition-transform duration-300 ease-in-out
          md:static md:translate-x-0
          ${isOpen ? "translate-x-0 shadow-lg" : "-translate-x-full"}
        `}
      >
        {/* Logo and Mobile Close */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <Link 
            href="/expedientes" 
            className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => close()}
          >
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-primary">
              <Zap size={14} className="text-white" aria-hidden />
            </div>
            <span className="text-sm font-medium text-text-primary tracking-tight">
              PermitFlow <span className="text-primary font-semibold">ES</span>
            </span>
          </Link>
          
          <button 
            className="rounded-md p-1.5 text-text-secondary hover:bg-bg hover:text-text-primary md:hidden outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={close}
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navegación principal */}
        <nav className="flex-1 overflow-y-auto px-4 py-4" aria-label="Navegación principal">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => close()}
                    className={`
                      flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary
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
        <div className="mt-auto border-t border-border px-4 py-4 space-y-2">
          <Link
            href="/ajustes"
            onClick={() => close()}
            className={`
              flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary
              ${pathname === "/ajustes"
                ? "bg-primary-light text-primary font-medium"
                : "text-text-secondary hover:bg-bg hover:text-text-primary"
              }
            `}
          >
            <Settings size={16} aria-hidden />
            Ajustes
          </Link>

          <SidebarUser />
        </div>
      </aside>
    </>
  );
}
