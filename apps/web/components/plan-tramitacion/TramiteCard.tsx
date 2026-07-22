"use client";

import { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Euro,
  ExternalLink,
  FileText,
  Loader2,
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
      className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-0.5 text-[10px] text-text-secondary"
      title={`Basado en ${estadistica.muestraN} casos reales tramitados en PermitFlow`}
    >
      <BarChart3 size={10} aria-hidden />
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

  // Trámite en curso con plazo legal: semáforo verde/ámbar/rojo
  if (plazo && plazo.diasRestantes !== null && legal) {
    const { diasTranscurridos, diasRestantes, vencido } = plazo;
    const proximo = !vencido && diasRestantes <= 7;
    const estilo = vencido
      ? "bg-danger-light text-danger-dark"
      : proximo
        ? "bg-warning-light text-warning-dark"
        : "bg-success-light text-success-dark";
    const texto = vencido
      ? `plazo vencido hace ${Math.abs(diasRestantes)}d`
      : `dia ${diasTranscurridos} de ${legal} — quedan ${diasRestantes}d`;

    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${estilo}`}
        title="Dias naturales desde el inicio del tramite. Orientativo: algunos plazos legales se computan en dias habiles."
      >
        {vencido ? (
          <AlertTriangle size={10} aria-hidden />
        ) : (
          <Clock size={10} aria-hidden />
        )}
        {texto}
      </span>
    );
  }

  // En curso pero sin plazo legal definido
  if (plazo) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning-light px-2.5 py-0.5 text-[11px] font-medium text-warning-dark">
        <Clock size={10} aria-hidden />
        en curso — dia {plazo.diasTranscurridos}
      </span>
    );
  }

  if (!estimado && !legal) return null;

  const diff = legal && estimado ? legal - estimado : null;
  const hayMargen = diff !== null && diff > 0;

  return (
    <div className="flex items-center gap-1.5">
      {estimado && (
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] text-text-secondary">
          <Clock size={11} aria-hidden />
          ~{estimado} dias
        </span>
      )}
      {legal && (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
            hayMargen
              ? "bg-success-light text-success-dark"
              : "bg-warning-light text-warning-dark"
          }`}
          title={`Plazo legal maximo: ${legal} dias`}
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
    "mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors";

  if (!onChange) {
    // Solo lectura (plan sin expediente persistido)
    return <span className={`${base} bg-primary text-white`}>{orden}</span>;
  }

  const estilo =
    estado === "completado"
      ? "bg-success text-white hover:opacity-90"
      : estado === "en_curso"
        ? "bg-warning text-white hover:opacity-90"
        : "border-2 border-border bg-surface text-text-secondary hover:border-primary hover:text-primary";

  return (
    <button
      onClick={() => onChange(SIGUIENTE_ESTADO[estado])}
      disabled={pending}
      className={`${base} ${estilo} disabled:opacity-60`}
      title={ESTADO_TITULO[estado]}
      aria-label={`Tramite ${orden}: ${ESTADO_TITULO[estado].toLowerCase()}`}
    >
      {pending ? (
        <Loader2 size={12} className="animate-spin" aria-hidden />
      ) : estado === "completado" ? (
        <Check size={13} aria-hidden />
      ) : (
        orden
      )}
    </button>
  );
}

function DocumentoItem({ doc }: { doc: DocumentoRequerido }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="border-b border-border last:border-0">
      <button
        className="flex w-full items-start gap-2.5 rounded px-1 py-2.5 text-left transition-colors hover:bg-bg"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        {doc.obligatorio ? (
          <FileText size={13} className="mt-0.5 flex-shrink-0 text-text-secondary/60" aria-hidden />
        ) : (
          <Circle size={13} className="mt-0.5 flex-shrink-0 text-text-secondary/40" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <span className="text-xs leading-snug text-text-primary">
            {doc.label}
            {!doc.obligatorio && (
              <span className="ml-1.5 text-[10px] text-text-secondary">(opcional)</span>
            )}
          </span>
          {expanded && doc.descripcion && (
            <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
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
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex w-full items-start gap-4 p-5 transition-colors hover:bg-bg">
        <EstadoTramiteButton
          orden={tramite.orden}
          estado={estado}
          pending={pending}
          onChange={onEstadoChange}
        />

        <button
          className="flex min-w-0 flex-1 items-start gap-4 text-left"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <div className="min-w-0 flex-1">
            <p
              className={`text-sm font-medium leading-snug ${
                estado === "completado"
                  ? "text-text-secondary line-through"
                  : "text-text-primary"
              }`}
            >
              {tramite.nombre}
            </p>
            <p className="mt-0.5 truncate text-xs text-text-secondary">
              {tramite.organismo}
            </p>
          </div>

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
              estadoInfo={estadoInfo}
            />
            <EstadisticaRealBadge estadistica={estadistica} />
          </div>
        </button>
      </div>

      {open && (
        <div className="divide-y divide-border border-t border-border">
          <div className="flex items-start justify-between gap-4 px-5 py-3">
            <p className="font-mono text-[11px] leading-relaxed text-text-secondary">
              {tramite.base_legal}
            </p>
            {tramite.plataforma_url && (
              <a
                href={tramite.plataforma_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-shrink-0 items-center gap-1 rounded-lg border border-primary/30 bg-primary-light px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-white"
              >
                Tramitar online
                <ExternalLink size={11} aria-hidden />
              </a>
            )}
          </div>

          {tramite.coste_estimado && (
            <div className="flex items-start gap-2.5 px-5 py-3">
              <Euro size={13} className="mt-0.5 flex-shrink-0 text-text-secondary/60" aria-hidden />
              <p className="text-xs leading-relaxed text-text-secondary">
                <span className="font-medium text-text-primary">Coste estimado: </span>
                {tramite.coste_estimado}
              </p>
            </div>
          )}

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

          {tramite.notas && (
            <div className="flex items-start gap-2.5 px-5 py-3">
              <AlertTriangle size={13} className="mt-0.5 flex-shrink-0 text-warning" aria-hidden />
              <p className="text-xs leading-relaxed text-text-secondary">
                {tramite.notas}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
