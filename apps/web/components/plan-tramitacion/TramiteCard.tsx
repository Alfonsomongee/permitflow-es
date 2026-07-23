"use client";

import { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Euro,
  ExternalLink,
  FileText,
  Loader2,
  Scale,
} from "lucide-react";
import { PlataformaBadge } from "./PlataformaBadge";
import type {
  DocumentoRequerido,
  EstadisticaPlazo,
  Tramite,
  TramiteEstado,
  TramiteEstadoInfo,
} from "@/types/plan";
import { calcularPlazo } from "@/lib/plazos";

function EstadisticaRealBadge({ estadistica }: { estadistica?: EstadisticaPlazo }) {
  if (!estadistica) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-text-secondary"
      title={`Basado en ${estadistica.muestraN} casos reales tramitados en PermitFlow`}
    >
      <BarChart3 size={11} aria-hidden />
      media real: {estadistica.medianaRealDias}d
    </span>
  );
}

function PlazoBadge({
  estimado,
  legal,
  estadoInfo,
}: {
  estimado: number | null;
  legal: number | null;
  estadoInfo?: TramiteEstadoInfo;
}) {
  const plazo = calcularPlazo(estadoInfo, legal);

  if (plazo && plazo.diasRestantes !== null && legal) {
    const { diasTranscurridos, diasRestantes, vencido } = plazo;
    const proximo = !vencido && diasRestantes <= 7;
    const estilo = vencido ? "bg-danger text-white" : proximo ? "bg-warning text-white" : "bg-success text-white";
    const texto = vencido
      ? `vencido hace ${Math.abs(diasRestantes)}d`
      : `día ${diasTranscurridos}/${legal} · quedan ${diasRestantes}d`;

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold shadow-sm ${estilo}`}
        title="Días naturales desde el inicio del trámite. Orientativo: algunos plazos legales se computan en días hábiles."
      >
        {vencido ? <AlertTriangle size={11} aria-hidden /> : <Clock size={11} aria-hidden />}
        {texto}
      </span>
    );
  }

  if (plazo) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-warning px-3 py-1 text-[11px] font-semibold text-white shadow-sm">
        <Clock size={11} aria-hidden />
        en curso · día {plazo.diasTranscurridos}
      </span>
    );
  }

  if (!estimado && !legal) return null;

  const diff = legal && estimado ? legal - estimado : null;
  const hayMargen = diff !== null && diff > 0;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {estimado && (
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-text-secondary">
          <Clock size={11} aria-hidden />
          ~{estimado}d estimado
        </span>
      )}
      {legal && (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            hayMargen ? "bg-success-light text-success-dark" : "bg-warning-light text-warning-dark"
          }`}
          title={`Plazo legal máximo: ${legal} días`}
        >
          {hayMargen ? <CheckCircle2 size={11} aria-hidden /> : <AlertTriangle size={11} aria-hidden />}
          legal: {legal}d
        </span>
      )}
    </div>
  );
}

const SIGUIENTE_ESTADO: Record<TramiteEstado, TramiteEstado> = {
  pendiente: "en_curso",
  en_curso: "completado",
  completado: "pendiente",
};

const ESTADO_TITULO: Record<TramiteEstado, string> = {
  pendiente: "Marcar como en curso",
  en_curso: "Marcar como completado",
  completado: "Volver a pendiente",
};

function EstadoTramiteButton({
  orden,
  estado,
  pending,
  onChange,
}: {
  orden: number;
  estado: TramiteEstado;
  pending: boolean;
  onChange?: (estado: TramiteEstado) => void;
}) {
  const base =
    "mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all";

  if (!onChange) {
    return <span className={`${base} bg-primary text-white shadow-sm`}>{orden}</span>;
  }

  const estilo =
    estado === "completado"
      ? "bg-success text-white shadow-sm hover:opacity-90"
      : estado === "en_curso"
        ? "bg-warning text-white shadow-sm hover:opacity-90"
        : "border-2 border-border bg-surface text-text-secondary hover:border-primary hover:text-primary hover:scale-105";

  return (
    <button
      onClick={() => onChange(SIGUIENTE_ESTADO[estado])}
      disabled={pending}
      className={`${base} ${estilo} disabled:opacity-60 disabled:hover:scale-100`}
      title={ESTADO_TITULO[estado]}
      aria-label={`Trámite ${orden}: ${ESTADO_TITULO[estado].toLowerCase()}`}
    >
      {pending ? (
        <Loader2 size={15} className="animate-spin" aria-hidden />
      ) : estado === "completado" ? (
        <Check size={16} aria-hidden />
      ) : (
        orden
      )}
    </button>
  );
}

function DocumentoItem({ doc }: { doc: DocumentoRequerido }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="border-b border-border/70 last:border-0">
      <button
        className="flex w-full items-start gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-bg"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <span
          className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border ${
            doc.obligatorio ? "border-primary/30 bg-primary-light text-primary" : "border-border bg-bg text-text-secondary"
          }`}
        >
          <FileText size={11} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <span className="text-sm leading-snug text-text-primary">
            {doc.label}
            {!doc.obligatorio && (
              <span className="ml-1.5 rounded bg-bg px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
                opcional
              </span>
            )}
          </span>
          {expanded && doc.descripcion && (
            <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">{doc.descripcion}</p>
          )}
        </div>
        <ChevronDown
          size={13}
          className={`mt-1 flex-shrink-0 text-text-secondary/50 transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
    </li>
  );
}

interface TramiteCardProps {
  tramite: Tramite;
  defaultOpen?: boolean;
  estadoInfo?: TramiteEstadoInfo;
  pending?: boolean;
  onEstadoChange?: (estado: TramiteEstado) => void;
  estadistica?: EstadisticaPlazo;
}

export function TramiteCard({
  tramite,
  defaultOpen = false,
  estadoInfo,
  pending = false,
  onEstadoChange,
  estadistica,
}: TramiteCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const estado: TramiteEstado = estadoInfo?.estado ?? "pendiente";

  const obligatorios = tramite.documentos_requeridos.filter((doc) => doc.obligatorio);
  const opcionales = tramite.documentos_requeridos.filter((doc) => !doc.obligatorio);

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-surface transition-shadow ${
        open ? "border-primary/30 shadow-md" : "border-border shadow-sm hover:shadow-md"
      }`}
    >
      <div className="flex w-full items-start gap-4 p-5 sm:p-6">
        <EstadoTramiteButton orden={tramite.orden} estado={estado} pending={pending} onChange={onEstadoChange} />

        <button
          className="flex min-w-0 flex-1 flex-col gap-3 text-left sm:flex-row sm:items-start sm:justify-between"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <div className="min-w-0 flex-1">
            <p
              className={`text-base font-semibold leading-snug ${
                estado === "completado" ? "text-text-secondary line-through" : "text-text-primary"
              }`}
            >
              {tramite.nombre}
            </p>
            <p className="mt-1 truncate text-sm text-text-secondary">{tramite.organismo}</p>
          </div>

          <div className="flex flex-shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
            <div className="flex items-center gap-2">
              <PlataformaBadge plataforma={tramite.plataforma} />
              <ChevronDown
                size={16}
                className={`hidden text-text-secondary transition-transform duration-200 sm:block ${
                  open ? "rotate-180" : ""
                }`}
                aria-hidden
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <PlazoBadge estimado={tramite.plazo_estimado_dias} legal={tramite.plazo_legal_dias} estadoInfo={estadoInfo} />
              <EstadisticaRealBadge estadistica={estadistica} />
            </div>
          </div>
        </button>
      </div>

      {open && (
        <div className="divide-y divide-border/70 border-t border-border bg-bg/40">
          <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2 sm:px-6">
            <div className="flex items-start gap-2.5">
              <Scale size={14} className="mt-0.5 flex-shrink-0 text-text-secondary" aria-hidden />
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">Base legal</p>
                <p className="mt-0.5 text-xs leading-relaxed text-text-primary">{tramite.base_legal}</p>
              </div>
            </div>
            {tramite.coste_estimado && (
              <div className="flex items-start gap-2.5">
                <Euro size={14} className="mt-0.5 flex-shrink-0 text-text-secondary" aria-hidden />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">Coste estimado</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-text-primary">{tramite.coste_estimado}</p>
                </div>
              </div>
            )}
          </div>

          {tramite.plataforma_url && (
            <div className="px-5 py-3 sm:px-6">
              <a
                href={tramite.plataforma_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
              >
                Tramitar online
                <ExternalLink size={12} aria-hidden />
              </a>
            </div>
          )}

          {obligatorios.length > 0 && (
            <div className="px-5 py-4 sm:px-6">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                Documentos obligatorios ({obligatorios.length})
              </p>
              <ul>
                {obligatorios.map((doc) => (
                  <DocumentoItem key={doc.id} doc={doc} />
                ))}
              </ul>
            </div>
          )}

          {opcionales.length > 0 && (
            <div className="px-5 py-4 sm:px-6">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                Documentos opcionales ({opcionales.length})
              </p>
              <ul>
                {opcionales.map((doc) => (
                  <DocumentoItem key={doc.id} doc={doc} />
                ))}
              </ul>
            </div>
          )}

          {tramite.notas && (
            <div className="flex items-start gap-2.5 bg-warning-light/50 px-5 py-4 sm:px-6">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-warning-dark" aria-hidden />
              <p className="text-xs leading-relaxed text-warning-dark">{tramite.notas}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
