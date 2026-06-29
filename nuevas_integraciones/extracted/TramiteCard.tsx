"use client";

import { useState } from "react";
import {
  ChevronDown,
  Clock,
  FileText,
  ExternalLink,
  Euro,
  AlertTriangle,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { PlataformaBadge } from "./PlataformaBadge";

// ─── Tipos (refleja el nuevo schema Pydantic v1.1) ────────────────────────────

export interface DocumentoRequerido {
  id: string;
  label: string;
  descripcion: string;
  obligatorio: boolean;
}

export interface Tramite {
  orden: number;
  nombre: string;
  organismo: string;
  base_legal: string;
  plazo_estimado_dias: number | null;
  plazo_legal_dias: number | null;
  documentos_requeridos: DocumentoRequerido[];
  notas: string | null;
  plataforma: "PUES" | "TECI" | "MITECO" | "distribuidora" | "ayuntamiento" | null;
  plataforma_url: string | null;
  coste_estimado: string | null;
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function PlazoBadge({
  estimado,
  legal,
}: {
  estimado: number | null;
  legal: number | null;
}) {
  if (!estimado && !legal) return null;

  const diff = legal && estimado ? legal - estimado : null;
  const hayMargen = diff !== null && diff > 0;

  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] text-text-secondary">
        <Clock size={11} aria-hidden />
        ~{estimado} días
      </span>
      {legal && (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
            hayMargen
              ? "bg-success-light text-success-dark"
              : "bg-warning-light text-warning-dark"
          }`}
          title={`Plazo legal máximo: ${legal} días`}
        >
          {hayMargen ? (
            <CheckCircle2 size={10} aria-hidden />
          ) : (
            <AlertTriangle size={10} aria-hidden />
          )}
          legal: {legal}d
        </span>
      )}
    </div>
  );
}

function DocumentoItem({ doc }: { doc: DocumentoRequerido }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="border-b border-border last:border-0">
      <button
        className="flex w-full items-start gap-2.5 py-2.5 text-left hover:bg-bg transition-colors px-1 rounded"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {doc.obligatorio ? (
          <FileText size={13} className="mt-0.5 flex-shrink-0 text-text-secondary/60" aria-hidden />
        ) : (
          <Circle size={13} className="mt-0.5 flex-shrink-0 text-text-secondary/40" aria-hidden />
        )}
        <div className="flex-1 min-w-0">
          <span className="text-xs text-text-primary leading-snug">
            {doc.label}
            {!doc.obligatorio && (
              <span className="ml-1.5 text-[10px] text-text-secondary">(opcional)</span>
            )}
          </span>
          {expanded && doc.descripcion && (
            <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">
              {doc.descripcion}
            </p>
          )}
        </div>
        <ChevronDown
          size={12}
          className={`mt-0.5 flex-shrink-0 text-text-secondary/50 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>
    </li>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface TramiteCardProps {
  tramite: Tramite;
  defaultOpen?: boolean;
}

export function TramiteCard({ tramite, defaultOpen = false }: TramiteCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  const obligatorios = tramite.documentos_requeridos.filter((d) => d.obligatorio);
  const opcionales = tramite.documentos_requeridos.filter((d) => !d.obligatorio);

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Cabecera */}
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
          <p className="mt-0.5 text-xs text-text-secondary truncate">
            {tramite.organismo}
          </p>
        </div>

        {/* Meta derecha */}
        <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5">
            <PlataformaBadge plataforma={tramite.plataforma} />
            <ChevronDown
              size={15}
              className={`text-text-secondary transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
              aria-hidden
            />
          </div>
          <PlazoBadge
            estimado={tramite.plazo_estimado_dias}
            legal={tramite.plazo_legal_dias}
          />
        </div>
      </button>

      {/* Contenido expandido */}
      {open && (
        <div className="border-t border-border divide-y divide-border">
          {/* Base legal + enlace plataforma */}
          <div className="px-5 py-3 flex items-start justify-between gap-4">
            <p className="font-mono text-[11px] text-text-secondary leading-relaxed">
              {tramite.base_legal}
            </p>
            {tramite.plataforma_url && (
              <a
                href={tramite.plataforma_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 flex items-center gap-1 rounded-lg border border-primary/30 bg-primary-light px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary hover:text-white transition-colors"
              >
                Tramitar online
                <ExternalLink size={11} aria-hidden />
              </a>
            )}
          </div>

          {/* Coste estimado */}
          {tramite.coste_estimado && (
            <div className="flex items-start gap-2.5 px-5 py-3">
              <Euro size={13} className="mt-0.5 flex-shrink-0 text-text-secondary/60" aria-hidden />
              <p className="text-xs text-text-secondary leading-relaxed">
                <span className="font-medium text-text-primary">Coste estimado: </span>
                {tramite.coste_estimado}
              </p>
            </div>
          )}

          {/* Documentos obligatorios */}
          {obligatorios.length > 0 && (
            <div className="px-5 py-3">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                Documentos obligatorios ({obligatorios.length})
              </p>
              <ul>
                {obligatorios.map((doc) => (
                  <DocumentoItem key={doc.id} doc={doc} />
                ))}
              </ul>
            </div>
          )}

          {/* Documentos opcionales */}
          {opcionales.length > 0 && (
            <div className="px-5 py-3">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                Documentos opcionales ({opcionales.length})
              </p>
              <ul>
                {opcionales.map((doc) => (
                  <DocumentoItem key={doc.id} doc={doc} />
                ))}
              </ul>
            </div>
          )}

          {/* Notas */}
          {tramite.notas && (
            <div className="flex gap-2.5 items-start px-5 py-3">
              <AlertTriangle
                size={13}
                className="flex-shrink-0 mt-0.5 text-warning"
                aria-hidden
              />
              <p className="text-xs text-text-secondary leading-relaxed">
                {tramite.notas}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
