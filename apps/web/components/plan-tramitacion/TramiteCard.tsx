"use client";

import { useState } from "react";
import { ChevronDown, Clock, FileText } from "lucide-react";
import { type Tramite, formatDocLabel } from "@/types/plan";
import { PlataformaBadge } from "./PlataformaBadge";

interface TramiteCardProps {
  tramite: Tramite;
  /** Expandido por defecto en los primeros N trámites */
  defaultOpen?: boolean;
}

export function TramiteCard({ tramite, defaultOpen = false }: TramiteCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  const plazo = tramite.plazo_estimado_dias;

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Cabecera siempre visible */}
      <button
        className="flex w-full items-start gap-4 p-5 text-left hover:bg-bg transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {/* Número de orden */}
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-medium mt-0.5">
          {tramite.orden}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary leading-snug">
            {tramite.nombre}
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">
            {tramite.organismo}
          </p>
        </div>

        {/* Meta: plataforma + plazo */}
        <div className="flex flex-shrink-0 items-center gap-2 mt-0.5">
          <PlataformaBadge plataforma={tramite.plataforma} />
          {plazo !== null && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] text-text-secondary">
              <Clock size={11} aria-hidden />
              {plazo} {plazo === 1 ? "día" : "días"}
            </span>
          )}
          <ChevronDown
            size={15}
            className={`text-text-secondary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </div>
      </button>

      {/* Contenido expandible */}
      {open && (
        <div className="border-t border-border px-5 pb-5 pt-4 space-y-4">
          {/* Base legal */}
          <p className="font-mono text-[11px] text-text-secondary">
            {tramite.base_legal}
          </p>

          {/* Documentos requeridos */}
          {tramite.documentos_requeridos.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                Documentos requeridos
              </p>
              <ul className="divide-y divide-border">
                {tramite.documentos_requeridos.map((doc) => (
                  <li
                    key={doc}
                    className="flex items-center gap-2.5 py-2 text-xs text-text-secondary"
                  >
                    <FileText size={13} className="flex-shrink-0 text-text-secondary/50" aria-hidden />
                    {formatDocLabel(doc)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Notas */}
          {tramite.notas && (
            <div className="rounded-lg bg-bg px-4 py-3 text-xs text-text-secondary leading-relaxed">
              {tramite.notas}
            </div>
          )}

          {/* Plazos y costes */}
          {(tramite.plazo_legal_dias ?? tramite.coste_estimado) && (
            <div className="flex flex-wrap gap-4 text-xs text-text-secondary">
              {tramite.plazo_legal_dias && (
                <span>
                  <span className="font-medium text-text-primary">
                    Plazo legal:{" "}
                  </span>
                  {tramite.plazo_legal_dias} días
                </span>
              )}
              {tramite.coste_estimado && (
                <span>
                  <span className="font-medium text-text-primary">
                    Coste estimado:{" "}
                  </span>
                  {tramite.coste_estimado}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
