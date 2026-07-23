"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, MapPin, Zap } from "lucide-react";
import {
  type InstalacionParams,
  type PlanTramitacion,
  type TramitesEstadoMap,
  COMUNIDAD_LABEL,
  TIPO_LABEL,
} from "@/types/plan";
import { TramiteCard } from "./TramiteCard";
import { ResumenPanel } from "./ResumenPanel";
import { ExportPdfButton } from "./ExportPdfButton";
import { DetallesExpediente } from "./DetallesExpediente";
import { DocumentosPanel } from "./DocumentosPanel";
import { TimelinePlan } from "./TimelinePlan";
import { ValidadorPanel } from "./ValidadorPanel";
import { useTramitesEstado } from "./useTramitesEstado";
import { useEstadisticasPlazo } from "./useEstadisticasPlazo";
import { claveTramite } from "@/lib/tramiteClave";

type ExpedienteEstado = "borrador" | "pendiente" | "en_revision" | "aprobado" | "rechazado";

interface PlanTramitacionViewProps {
  plan: PlanTramitacion;
  params: InstalacionParams;
  expediente?: {
    id: string;
    estado: ExpedienteEstado;
    tramitesCompletados: number;
    creadoEn: string;
    actualizadoEn: string;
    tramitesEstado: TramitesEstadoMap;
    referenciaCliente: string | null;
    notas: string | null;
  };
}

const ESTADO_LABEL: Record<ExpedienteEstado, string> = {
  borrador: "Borrador",
  pendiente: "Pendiente",
  en_revision: "En revisión",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

const ESTADO_DOT: Record<ExpedienteEstado, string> = {
  borrador: "bg-text-secondary",
  pendiente: "bg-warning",
  en_revision: "bg-primary",
  aprobado: "bg-success",
  rechazado: "bg-danger",
};

function formatDate(value?: string): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function StatChip({
  label,
  value,
  sub,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: typeof CheckCircle2;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex min-w-[120px] flex-col justify-center rounded-xl border px-4 py-2.5 ${
        accent ? "border-primary bg-primary shadow-sm" : "border-border bg-surface"
      }`}
    >
      <p
        className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${
          accent ? "text-white/80" : "text-text-secondary"
        }`}
      >
        {Icon && <Icon size={11} aria-hidden />}
        {label}
      </p>
      <p className={`mt-0.5 text-lg font-bold ${accent ? "text-white" : "text-text-primary"}`}>
        {value}
      </p>
      {sub && (
        <p className={`text-[10px] ${accent ? "text-white/70" : "text-text-secondary"}`}>{sub}</p>
      )}
    </div>
  );
}

export function PlanTramitacionView({ plan, params, expediente }: PlanTramitacionViewProps) {
  const { estados, completados, pendingOrden, error, setEstadoTramite } = useTramitesEstado(
    expediente?.id ?? "",
    expediente?.tramitesEstado ?? {}
  );
  const estadisticasPlazo = useEstadisticasPlazo(expediente?.id);

  const titulo = TIPO_LABEL[params.tipo_instalacion] ?? params.tipo_instalacion;
  const ccaa = COMUNIDAD_LABEL[params.comunidad] ?? params.comunidad;

  const tramitesCompletados = expediente ? completados : 0;
  const progreso =
    expediente && plan.tramites.length > 0
      ? Math.round((tramitesCompletados / plan.tramites.length) * 100)
      : 0;
  const fechaActualizacion = formatDate(expediente?.actualizadoEn);

  return (
    <div className="min-h-screen bg-bg">
      <div className="no-print border-b border-border bg-surface px-4 py-2.5 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link
            href="/expedientes"
            className="flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft size={15} aria-hidden />
            Expedientes
          </Link>
          <ExportPdfButton titulo={titulo} expedienteId={expediente?.id} />
        </div>
      </div>

      <div className="print-header border-b border-border bg-gradient-to-br from-primary-light via-surface to-surface px-4 py-8 sm:px-6 print:bg-none print:py-4">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-sm">
                <Zap size={22} aria-hidden />
              </div>
              <div className="min-w-0">
                {expediente && (
                  <span className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                    <span className={`h-1.5 w-1.5 rounded-full ${ESTADO_DOT[expediente.estado]}`} />
                    {ESTADO_LABEL[expediente.estado]}
                  </span>
                )}
                <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
                  {titulo}
                </h1>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-text-secondary">
                  <span className="flex items-center gap-1">
                    <MapPin size={13} aria-hidden />
                    {ccaa}
                    {params.municipio ? ` · ${params.municipio}` : ""}
                  </span>
                  <span className="text-border">·</span>
                  <span className="font-medium">{params.potencia_kw} kW</span>
                </p>
              </div>
            </div>

            {expediente && (
              <div className="grid grid-cols-2 gap-3 sm:flex sm:items-stretch">
                <StatChip
                  label="Progreso"
                  value={`${progreso}%`}
                  sub={`${tramitesCompletados}/${plan.tramites.length} trámites`}
                  icon={CheckCircle2}
                  accent
                />
                {fechaActualizacion && (
                  <StatChip label="Actualizado" value={fechaActualizacion} icon={Clock3} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-6">
            <TimelinePlan
              tramites={plan.tramites}
              estados={expediente ? estados : undefined}
              tiempoSerie={plan.tiempo_total_estimado_dias}
            />

            {error && (
              <p className="rounded-xl border border-danger/30 bg-danger-light px-4 py-3 text-xs text-danger-dark">
                {error}
              </p>
            )}

            <div className="space-y-3">
              {plan.tramites.map((tramite, i) => (
                <TramiteCard
                  key={tramite.orden}
                  tramite={tramite}
                  defaultOpen={i < 2}
                  estadoInfo={estados[String(tramite.orden)]}
                  pending={pendingOrden === tramite.orden}
                  onEstadoChange={
                    expediente ? (estado) => setEstadoTramite(tramite.orden, estado) : undefined
                  }
                  estadistica={estadisticasPlazo[claveTramite(tramite)]}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
            <div className="no-print flex flex-col gap-4">
              {expediente && <ValidadorPanel expedienteId={expediente.id} />}
              {expediente && (
                <DocumentosPanel expedienteId={expediente.id} tipoInstalacion={params.tipo_instalacion} />
              )}
              {expediente && (
                <DetallesExpediente
                  expedienteId={expediente.id}
                  referenciaCliente={expediente.referenciaCliente}
                  notas={expediente.notas}
                />
              )}
            </div>
            <ResumenPanel plan={plan} params={params} />
          </div>
        </div>
      </main>
    </div>
  );
}
