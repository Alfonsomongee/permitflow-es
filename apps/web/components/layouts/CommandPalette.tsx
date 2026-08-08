"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import {
  Plus,
  Compass,
  FileText,
  Bell,
  BarChart2,
  Calculator,
  LayoutGrid,
  Settings,
  Search,
  CornerDownLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { COMUNIDAD_LABEL, TIPO_LABEL, ESTADO_LABEL, type EstadoExpediente } from "@/components/dashboard/types";
import { useCommandPaletteStore } from "@/store/use-command-palette-store";

/**
 * apps/web/components/layouts/CommandPalette.tsx
 *
 * Buscador de comandos global (Cmd/Ctrl+K). Combina acciones estáticas de
 * navegación con búsqueda de expedientes por cliente/comunidad/tipo, para
 * que una gestoría con muchos expedientes abiertos no dependa del ratón
 * (mejora 2026-08-08). Deliberadamente sobrio: sin efectos de brillo ni
 * animaciones vistosas, en línea con el resto del panel de trabajo.
 */

interface ExpedienteResultado {
  id: string;
  cliente: string | null;
  comunidad: string;
  tipo_instalacion: string;
  estado: EstadoExpediente;
}

interface Accion {
  id: string;
  label: string;
  href: string;
  icon: typeof Plus;
  keywords?: string;
}

const ACCIONES: Accion[] = [
  { id: "nueva", label: "Crear nueva instalación", href: "/nueva-instalacion", icon: Plus },
  { id: "expedientes", label: "Ver todos los expedientes", href: "/expedientes", icon: LayoutGrid },
  { id: "simulador", label: "Simulador de autoconsumo", href: "/simulador", icon: Calculator, keywords: "ahorro financiero" },
  { id: "orientacion", label: "Orientación de tecnologías", href: "/orientacion", icon: Compass },
  { id: "plantillas", label: "Plantillas de documentos", href: "/plantillas", icon: FileText },
  { id: "alertas", label: "Alertas del BOE", href: "/alertas", icon: Bell, keywords: "boe normativa" },
  { id: "estadisticas", label: "Estadísticas", href: "/estadisticas", icon: BarChart2 },
  { id: "ajustes", label: "Ajustes", href: "/ajustes", icon: Settings },
];

export function CommandPalette() {
  const router = useRouter();
  const open = useCommandPaletteStore((s) => s.open);
  const setOpen = useCommandPaletteStore((s) => s.setOpen);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const [expedientes, setExpedientes] = useState<ExpedienteResultado[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Atajo global Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useCommandPaletteStore.getState().open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setOpen]);

  // Carga perezosa de expedientes: solo al abrir la primera vez, no en cada tecla.
  useEffect(() => {
    if (!open || expedientes !== null) return;
    fetch("/api/expedientes/buscar")
      .then((res) => (res.ok ? res.json() : { expedientes: [] }))
      .then((data) => setExpedientes(data.expedientes ?? []))
      .catch(() => setExpedientes([]));
  }, [open, expedientes]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlighted(0);
      // El popup tarda un tick en montar el input
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const accionesFiltradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ACCIONES;
    return ACCIONES.filter((a) => `${a.label} ${a.keywords ?? ""}`.toLowerCase().includes(q));
  }, [query]);

  const expedientesFiltrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    const lista = expedientes ?? [];
    if (!q) return lista.slice(0, 6);
    return lista
      .filter((e) => {
        const searchable = [
          e.cliente,
          COMUNIDAD_LABEL[e.comunidad] ?? e.comunidad,
          TIPO_LABEL[e.tipo_instalacion] ?? e.tipo_instalacion,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchable.includes(q);
      })
      .slice(0, 8);
  }, [expedientes, query]);

  type Entrada =
    | { kind: "accion"; accion: Accion }
    | { kind: "expediente"; expediente: ExpedienteResultado };

  const entradas: Entrada[] = useMemo(
    () => [
      ...accionesFiltradas.map((accion): Entrada => ({ kind: "accion", accion })),
      ...expedientesFiltrados.map((expediente): Entrada => ({ kind: "expediente", expediente })),
    ],
    [accionesFiltradas, expedientesFiltrados]
  );

  const ir = useCallback(
    (entrada: Entrada) => {
      setOpen(false);
      if (entrada.kind === "accion") {
        router.push(entrada.accion.href);
      } else {
        router.push(`/expedientes/${entrada.expediente.id}`);
      }
    },
    [router]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, entradas.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const entrada = entradas[highlighted];
      if (entrada) ir(entrada);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[100] bg-black/40 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          className="fixed left-1/2 top-[18%] z-[101] w-[92vw] max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-dropdown outline-none transition-[transform,opacity] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0"
          initialFocus={inputRef}
        >
          <Dialog.Title className="sr-only">Buscador de comandos</Dialog.Title>

          <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
            <Search size={15} className="flex-shrink-0 text-text-secondary" aria-hidden />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlighted(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Busca un expediente o escribe un comando..."
              className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
            />
            <kbd className="flex-shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
              Esc
            </kbd>
          </div>

          <div className="max-h-80 overflow-y-auto p-1.5">
            {entradas.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-text-secondary">
                Sin resultados para &quot;{query}&quot;.
              </p>
            )}

            {accionesFiltradas.length > 0 && (
              <div className="mb-1">
                <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                  Acciones rápidas
                </p>
                {accionesFiltradas.map((accion) => {
                  const index = entradas.findIndex((en) => en.kind === "accion" && en.accion.id === accion.id);
                  const Icon = accion.icon;
                  return (
                    <button
                      key={accion.id}
                      onClick={() => ir({ kind: "accion", accion })}
                      onMouseEnter={() => setHighlighted(index)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                        highlighted === index ? "bg-bg text-text-primary" : "text-text-secondary"
                      )}
                    >
                      <Icon size={15} className="flex-shrink-0" aria-hidden />
                      {accion.label}
                      {highlighted === index && (
                        <CornerDownLeft size={12} className="ml-auto flex-shrink-0 text-text-secondary" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {expedientesFiltrados.length > 0 && (
              <div>
                <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                  Expedientes
                </p>
                {expedientesFiltrados.map((expediente) => {
                  const index = entradas.findIndex(
                    (en) => en.kind === "expediente" && en.expediente.id === expediente.id
                  );
                  return (
                    <button
                      key={expediente.id}
                      onClick={() => ir({ kind: "expediente", expediente })}
                      onMouseEnter={() => setHighlighted(index)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                        highlighted === index ? "bg-bg text-text-primary" : "text-text-secondary"
                      )}
                    >
                      <LayoutGrid size={15} className="flex-shrink-0 text-text-secondary/70" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">
                        {expediente.cliente ?? "Sin referencia"}
                        <span className="text-text-secondary">
                          {" · "}
                          {COMUNIDAD_LABEL[expediente.comunidad] ?? expediente.comunidad}
                          {" · "}
                          {TIPO_LABEL[expediente.tipo_instalacion] ?? expediente.tipo_instalacion}
                        </span>
                      </span>
                      <span className="flex-shrink-0 text-[10px] text-text-secondary">
                        {ESTADO_LABEL[expediente.estado]}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
