"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { type Expediente, COMUNIDAD_LABEL, TIPO_LABEL } from "./types";
import {
  FASES_COMERCIALES_ORDEN,
  FASE_COMERCIAL_LABEL,
  agruparPorFase,
  type FaseComercial,
} from "@/lib/faseComercial";

const COLUMNA_ACENTO: Record<FaseComercial, string> = {
  prospeccion: "border-t-text-secondary",
  simulacion_enviada: "border-t-primary",
  clasificado: "border-t-primary",
  en_tramitacion: "border-t-warning",
  aprobado: "border-t-success",
  rechazado: "border-t-danger",
};

function TarjetaExpediente({
  expediente,
  onCambiarFase,
}: {
  expediente: Expediente;
  onCambiarFase: (id: string, fase: FaseComercial) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 shadow-xs">
      <Link
        href={`/expedientes/${expediente.id}`}
        className="group flex items-start justify-between gap-2"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text-primary group-hover:text-primary">
            {expediente.cliente ?? TIPO_LABEL[expediente.tipo_instalacion] ?? expediente.tipo_instalacion}
          </p>
          <p className="mt-0.5 truncate text-xs text-text-secondary">
            {TIPO_LABEL[expediente.tipo_instalacion] ?? expediente.tipo_instalacion} ·{" "}
            {COMUNIDAD_LABEL[expediente.comunidad] ?? expediente.comunidad} · {expediente.potencia_kw} kW
          </p>
        </div>
        <ArrowUpRight
          size={13}
          className="mt-0.5 flex-shrink-0 text-text-secondary opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
      </Link>
      <div className="mt-2.5">
        <Select
          value={expediente.fase_comercial}
          onValueChange={(valor) => onCambiarFase(expediente.id, valor as FaseComercial)}
        >
          <SelectTrigger className="h-7 w-full text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FASES_COMERCIALES_ORDEN.map((fase) => (
              <SelectItem key={fase} value={fase} className="text-[11px]">
                {FASE_COMERCIAL_LABEL[fase]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/**
 * Kanban comercial (roadmap de mejoras, PREM-02 -- primer paso hacia
 * "cartera de proyectos"). Sin arrastrar y soltar a propósito: el proyecto
 * no tenía ninguna librería de drag-and-drop y añadir una para esto habría
 * sido la parte más cara de una función que, con un selector por tarjeta,
 * ya resuelve el mismo problema (mover un expediente de fase) de forma
 * accesible por teclado sin dependencias nuevas.
 */
export function ExpedientesKanban({ expedientes }: { expedientes: Expediente[] }) {
  const [lista, setLista] = useState(expedientes);
  const columnas = agruparPorFase(lista);

  const cambiarFase = async (id: string, fase: FaseComercial) => {
    const anterior = lista;
    setLista((prev) => prev.map((e) => (e.id === id ? { ...e, fase_comercial: fase } : e)));

    try {
      const res = await fetch(`/api/expedientes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fase_comercial: fase }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setLista(anterior);
      toast.error("No se pudo mover el expediente. Inténtalo de nuevo.");
    }
  };

  if (lista.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface py-16 text-center shadow-xs">
        <p className="text-sm font-medium text-text-primary">Sin expedientes todavía</p>
        <p className="mt-1 text-xs text-text-secondary">
          Aparecerán aquí en cuanto generes tu primer plan de tramitación.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {FASES_COMERCIALES_ORDEN.map((fase) => (
        <div key={fase} className="w-64 flex-shrink-0">
          <div
            className={`rounded-t-xl border-t-2 bg-surface-2 px-3 py-2 ${COLUMNA_ACENTO[fase]}`}
          >
            <p className="flex items-center justify-between text-xs font-medium text-text-secondary">
              {FASE_COMERCIAL_LABEL[fase]}
              <span className="tabular-nums">{columnas[fase].length}</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-b-xl border border-t-0 border-border bg-bg/40 p-2 min-h-[80px]">
            {columnas[fase].map((expediente) => (
              <TarjetaExpediente
                key={expediente.id}
                expediente={expediente}
                onCambiarFase={cambiarFase}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
