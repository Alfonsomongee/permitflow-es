"use client";

import { useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Archive,
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
  Send,
} from "lucide-react";
import { PlataformaBadge } from "./PlataformaBadge";
import type {
  DocumentoRequerido,
  EstadisticaPlazo,
  Tramite,
  TramiteEstado,
  TramiteEstadoInfo,
} from "@/types/plan";
import { calcularPlazo, type PlazoCalculado } from "@/lib/plazos";

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
  plazo,
}: {
  estimado: number | null;
  legal: number | null;
  /** Calculado una sola vez en TramiteCard: también lo usa el aviso visible
   * de calendario no verificado, y calcularVencimientoHabil no es gratis
   * (recorre festivos.ts) como para duplicarlo por componente. */
  plazo: PlazoCalculado | null;
}) {
  if (plazo && plazo.diasRestantes !== null && legal) {
    const { diasTranscurridos, diasRestantes, vencido, calendarioVerificado } = plazo;
    const proximo = !vencido && diasRestantes <= 7;
    const estilo = vencido ? "bg-danger text-white" : proximo ? "bg-warning text-white" : "bg-success text-white";
    const texto = vencido
      ? `vencido hace ${Math.abs(diasRestantes)}d`
      : `día ${diasTranscurridos} · quedan ${diasRestantes}d (${legal} hábiles)`;
    const titulo = calendarioVerificado
      ? "Plazo en días hábiles (excluye sábados, domingos y festivos nacionales/autonómicos). No incluye festivos locales del municipio."
      : "Calendario de festivos no cargado para este año: solo se excluyen fines de semana. Fecha orientativa.";

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold shadow-sm ${estilo}`}
        title={titulo}
      >
        {vencido ? <AlertTriangle size={11} aria-hidden /> : <Clock size={11} aria-hidden />}
        {texto}
        {!calendarioVerificado && "*"}
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

function DocumentoItem({
  doc,
  extra,
}: {
  doc: DocumentoRequerido;
  /** Contenido adicional bajo la descripción del documento -- hoy solo lo
   * usa el portal de cliente (portal/[token]) para el control de subida.
   * undefined en el dashboard: cero cambio de comportamiento ahí. */
  extra?: ReactNode;
}) {
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
          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
              expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="overflow-hidden">
              {doc.descripcion && (
                <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">{doc.descripcion}</p>
              )}
            </div>
          </div>
        </div>
        <ChevronDown
          size={13}
          className={`mt-1 flex-shrink-0 text-text-secondary/50 transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {extra && <div className="px-2 pb-3">{extra}</div>}
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
  comunidad: string;
  /** Solo usado por el portal de cliente (portal/[token]) para insertar el
   * control de subida de cada documento requerido. undefined en el
   * dashboard normal. */
  renderDocumentoExtra?: (doc: DocumentoRequerido) => ReactNode;
}

// El nombre del trámite es intencionadamente el nombre oficial del
// procedimiento, sin traducir -- el usuario lo necesita literal para
// localizarlo en la sede electrónica. En comunidades con lengua cooficial
// eso a veces significa un nombre en catalán/euskera/gallego dentro de una
// interfaz en castellano, lo que puede leerse como un error de idioma en vez
// de la fidelidad deliberada que es. Heurística deliberadamente acotada al
// caso real encontrado (nombres catalanes tipo "declaració", "instal·lació"):
// no pretende ser un detector de idioma general.
// (auditoría de coherencia producto/experiencia 2026-08-12, P-11)
const COMUNIDADES_CON_LENGUA_COOFICIAL = new Set([
  "cataluna",
  "pais_vasco",
  "galicia",
  "baleares",
  "comunidad_valenciana",
  "navarra",
]);

function pareceNombreEnLenguaCooficial(nombre: string, comunidad: string): boolean {
  if (!COMUNIDADES_CON_LENGUA_COOFICIAL.has(comunidad)) return false;
  return /l·l|\bció\b|\bciós\b|instal·laci/i.test(nombre);
}

export function TramiteCard({
  tramite,
  defaultOpen = false,
  estadoInfo,
  pending = false,
  onEstadoChange,
  estadistica,
  comunidad,
  renderDocumentoExtra,
}: TramiteCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const estado: TramiteEstado = estadoInfo?.estado ?? "pendiente";

  const plazo = calcularPlazo(estadoInfo, tramite.plazo_legal_dias, comunidad);
  // Antes este aviso solo vivía en el `title` del badge (invisible en
  // móvil/touch, donde no hay hover). Misma condición que decide el "*" del
  // badge, para que el asterisco y su explicación nunca queden
  // desincronizados (auditoría de coherencia producto/experiencia
  // 2026-08-12, P-10).
  const avisoCalendarioNoVerificado = Boolean(
    plazo && plazo.diasRestantes !== null && tramite.plazo_legal_dias && !plazo.calendarioVerificado
  );

  const obligatorios = tramite.documentos_requeridos.filter((doc) => doc.obligatorio);
  const opcionales = tramite.documentos_requeridos.filter((doc) => !doc.obligatorio);

  const StatusIcon = estado === "completado" ? CheckCircle2 : estado === "en_curso" ? Loader2 : null;

  return (
    <div
      className={`tramite-card overflow-hidden rounded-2xl border bg-surface transition-shadow ${
        open ? "border-primary/30 shadow-md" : "border-border shadow-sm hover:shadow-md"
      }`}
    >
      <div className="flex w-full items-start gap-4 p-5 sm:p-6">
        {/* Número de orden */}
        <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold shadow-sm transition-colors ${
          estado === "completado" ? "bg-success text-white" : estado === "en_curso" ? "bg-warning text-white" : "bg-bg border border-border text-text-secondary"
        }`}>
          {estado === "completado" ? <Check size={16} /> : tramite.orden}
        </div>

        {/* Contenido principal (clicable para expandir) */}
        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          
          <button
            className="flex min-w-0 flex-1 flex-col gap-2 text-left"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
          >
            <div className="min-w-0">
              <p
                className={`text-base font-semibold leading-snug transition-colors ${
                  estado === "completado" ? "text-text-secondary" : "text-text-primary"
                }`}
              >
                {tramite.nombre}
              </p>
              {pareceNombreEnLenguaCooficial(tramite.nombre, comunidad) && (
                <p className="text-xs italic text-text-secondary">
                  Nombre oficial, tal como consta en la sede electrónica
                </p>
              )}
              <p className="mt-1 line-clamp-2 text-sm leading-snug text-text-secondary">{tramite.organismo}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-1">
              <PlataformaBadge plataforma={tramite.plataforma} />
              <PlazoBadge
                estimado={tramite.plazo_estimado_dias}
                legal={tramite.plazo_legal_dias}
                plazo={plazo}
              />
              <EstadisticaRealBadge estadistica={estadistica} />
            </div>
            {avisoCalendarioNoVerificado && (
              <p className="text-[11px] leading-snug text-text-secondary">
                * Fecha orientativa: no hay calendario de festivos verificado para
                este año, solo se excluyen fines de semana (no festivos
                nacionales, autonómicos ni locales).
              </p>
            )}
          </button>

          {/* Botonera derecha: Estado y flecha */}
          <div className="flex flex-shrink-0 items-center gap-3">
            {onEstadoChange ? (
              <div className="relative">
                <select
                  value={estado}
                  onChange={(e) => onEstadoChange(e.target.value as TramiteEstado)}
                  disabled={pending}
                  aria-label={`Estado del trámite: ${tramite.nombre}`}
                  className={`h-11 w-36 appearance-none rounded-xl border pl-3 pr-8 text-xs font-semibold shadow-sm outline-none transition-colors disabled:opacity-50 ${
                    estado === "completado" ? "border-success bg-success-light text-success-dark" :
                    estado === "en_curso" ? "border-warning bg-warning-light text-warning-dark" :
                    "border-border bg-surface text-text-primary hover:border-primary focus:border-primary"
                  }`}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="en_curso">En curso</option>
                  <option value="completado">Completado</option>
                </select>
                <div className="pointer-events-none absolute right-2.5 top-0 flex h-full items-center">
                  {pending ? (
                    <Loader2 size={14} className="animate-spin text-current opacity-70" />
                  ) : (
                    <ChevronDown size={14} className="text-current opacity-70" />
                  )}
                </div>
              </div>
            ) : (
              <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                  estado === "completado" ? "border-success bg-success-light text-success-dark" :
                  estado === "en_curso" ? "border-warning bg-warning-light text-warning-dark" :
                  "border-border bg-surface text-text-primary"
              }`}>
                {StatusIcon && <StatusIcon size={14} />}
                {estado === "completado" ? "Completado" : estado === "en_curso" ? "En curso" : "Pendiente"}
              </span>
            )}
            
            <button
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-label={open ? `Contraer detalles de ${tramite.nombre}` : `Ver detalles de ${tramite.nombre}`}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary shadow-sm transition-colors hover:border-primary hover:text-primary"
            >
              <ChevronDown
                size={16}
                className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
          </div>
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
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
              {/* El backend emite estos dos campos desde hace tiempo, pero
                  faltaban en el tipo del frontend y no se pintaban en ningún
                  sitio (auditoría QA 2026-08-11, B-01). */}
              {tramite.registro_salida && (
                <div className="flex items-start gap-2.5">
                  <Archive size={14} className="mt-0.5 flex-shrink-0 text-text-secondary" aria-hidden />
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">Registro de salida</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-text-primary">{tramite.registro_salida}</p>
                  </div>
                </div>
              )}
              {tramite.medio_presentacion && (
                <div className="flex items-start gap-2.5">
                  <Send size={14} className="mt-0.5 flex-shrink-0 text-text-secondary" aria-hidden />
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">Medio de presentación</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-text-primary">
                      {tramite.medio_presentacion === "electronico_obligatorio"
                        ? "Electrónico obligatorio"
                        : tramite.medio_presentacion.replace(/_/g, " ")}
                    </p>
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
                    <DocumentoItem key={doc.id} doc={doc} extra={renderDocumentoExtra?.(doc)} />
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
                    <DocumentoItem key={doc.id} doc={doc} extra={renderDocumentoExtra?.(doc)} />
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
        </div>
      </div>
    </div>
  );
}
