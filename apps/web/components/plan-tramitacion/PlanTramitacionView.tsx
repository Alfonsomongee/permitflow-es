"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ChevronDown, Clock3, MapPin, ShieldAlert, Zap } from "lucide-react";
import {
  type InstalacionParams,
  type PlanTramitacion,
  type TramitesEstadoMap,
  COMUNIDAD_LABEL,
  TIPO_LABEL,
  severidadVerificacion,
} from "@/types/plan";
import { TramiteCard } from "./TramiteCard";
import { ResumenPanel } from "./ResumenPanel";
import { ExportPdfButtons } from "./ExportPdfButton";
import { DetallesExpediente } from "./DetallesExpediente";
import { PortalClienteCard } from "./PortalClienteCard";
import { DocumentosClientePanel } from "./DocumentosClientePanel";
import { HistorialPanel } from "./HistorialPanel";
import { DocumentosPanel } from "./DocumentosPanel";
import { TimelinePlan } from "./TimelinePlan";
import { ValidadorPanel } from "./ValidadorPanel";
import { useTramitesEstado } from "./useTramitesEstado";
import { useEstadisticasPlazo } from "./useEstadisticasPlazo";
import { claveTramite } from "@/lib/tramiteClave";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, FileText } from "lucide-react";
import { AnimatedList } from "@/components/ui/animated-list";

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
    version: number;
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

function VerificacionBanner({ plan }: { plan: PlanTramitacion }) {
  const [abierto, setAbierto] = useState(false);
  const { nivel, etiqueta } = severidadVerificacion(plan);
  const huecos = plan.huecos_verificacion ?? [];

  if (nivel === "ninguno") return null;

  const estilos =
    nivel === "critico"
      ? "border-warning/30 bg-warning-light text-warning-dark"
      : "border-primary/20 bg-primary-light text-primary-dark";

  return (
    <div className={`rounded-xl border px-4 py-3 text-xs ${estilos}`}>
      <div className="flex items-start gap-2">
        <ShieldAlert size={14} className="mt-0.5 flex-shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{etiqueta}</p>
          <p className="mt-1 leading-relaxed">
            {plan.aviso ??
              "Plan basado en la normativa estatal aplicable. La verificación de las particularidades autonómicas de esta comunidad está en curso: contrasta plataformas y registros antes de presentar."}
          </p>
          {huecos.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setAbierto((v) => !v)}
                className="mt-2 flex items-center gap-1 font-medium underline-offset-2 hover:underline"
              >
                <ChevronDown
                  size={12}
                  className={`transition-transform ${abierto ? "rotate-180" : ""}`}
                  aria-hidden
                />
                {abierto ? "Ocultar" : "Ver"} {huecos.length}{" "}
                {huecos.length === 1 ? "hueco de verificación" : "huecos de verificación"}
              </button>
              {abierto && (
                <ul className="mt-2 list-disc space-y-1.5 pl-4">
                  {huecos.map((hueco, i) => (
                    <li key={i} className="leading-relaxed">
                      {hueco}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RiesgoNormativoBanner({ plan }: { plan: PlanTramitacion }) {
  const [abierto, setAbierto] = useState(false);
  const riesgo = plan.riesgo_normativo;

  if (!riesgo || riesgo.resumen.alto + riesgo.resumen.medio === 0) return null;

  const tramitesConRiesgo = riesgo.tramites.filter((t) => t.riesgo !== "bajo");

  return (
    <div className="rounded-xl border border-warning/30 bg-warning-light px-4 py-3 text-xs text-warning-dark">
      <div className="flex items-start gap-2">
        <ShieldAlert size={14} className="mt-0.5 flex-shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {riesgo.resumen.alto > 0
              ? `${riesgo.resumen.alto} trámite${riesgo.resumen.alto === 1 ? "" : "s"} con riesgo alto`
              : `${riesgo.resumen.medio} trámite${riesgo.resumen.medio === 1 ? "" : "s"} con riesgo medio`}
          </p>
          <p className="mt-1 leading-relaxed">
            Indicador cualitativo, no una predicción: refleja trámites sin base legal citada,
            sin plazo legal conocido o sin lista de documentos, combinado con la verificación
            de la normativa de origen.
          </p>
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            className="mt-2 flex items-center gap-1 font-medium underline-offset-2 hover:underline"
          >
            <ChevronDown
              size={12}
              className={`transition-transform ${abierto ? "rotate-180" : ""}`}
              aria-hidden
            />
            {abierto ? "Ocultar" : "Ver"} detalle por trámite
          </button>
          {abierto && (
            <ul className="mt-2 space-y-2">
              {tramitesConRiesgo.map((t) => (
                <li key={t.orden} className="leading-relaxed">
                  <span className="font-medium">
                    {t.orden}. {t.nombre}
                  </span>{" "}
                  <span className="uppercase text-[10px] tracking-wide">({t.riesgo})</span>
                  <ul className="list-disc pl-4">
                    {t.motivos.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
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
    expediente?.tramitesEstado ?? {},
    expediente?.version ?? 0
  );
  const estadisticasPlazo = useEstadisticasPlazo(expediente?.id);

  const titulo = TIPO_LABEL[params.tipo_instalacion] ?? params.tipo_instalacion;
  const ccaa = COMUNIDAD_LABEL[params.comunidad] ?? params.comunidad;

  const tramitesAccionables = plan.tramites.filter(t => t.tipo_actuacion === "accion_usuario" || t.tipo_actuacion === undefined);
  const tramitesOficio = plan.tramites.filter(t => t.tipo_actuacion === "oficio_administracion");
  const tramitesRevision = plan.tramites.filter(t => t.tipo_actuacion === "revision_manual");

  const tramitesCompletados = expediente ? completados : 0;
  const progreso =
    expediente && tramitesAccionables.length > 0
      ? Math.round((tramitesCompletados / tramitesAccionables.length) * 100)
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
          <ExportPdfButtons titulo={titulo} expedienteId={expediente?.id} />
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
                  sub={`${tramitesCompletados}/${tramitesAccionables.length} trámites`}
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
            <VerificacionBanner plan={plan} />
            <RiesgoNormativoBanner plan={plan} />
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
              {tramitesRevision.length > 0 && (
                <div className="mb-4 space-y-3 rounded-xl border border-warning bg-warning-light/50 p-4">
                  <h3 className="text-sm font-semibold text-warning-dark">Revisión requerida</h3>
                  {tramitesRevision.map((tramite) => (
                    <TramiteCard
                      key={tramite.orden}
                      tramite={tramite}
                      defaultOpen={true}
                      estadoInfo={undefined}
                      comunidad={params.comunidad}
                    />
                  ))}
                </div>
              )}

              <div className="mb-2 text-sm font-medium text-text-secondary">
                {tramitesAccionables.length} {tramitesAccionables.length === 1 ? "trámite" : "trámites"} a realizar
              </div>
              
              <AnimatedList className="space-y-3">
                {tramitesAccionables.map((tramite, i) => (
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
                    comunidad={params.comunidad}
                  />
                ))}
              </AnimatedList>

              {tramitesOficio.length > 0 && (
                <div className="mt-8">
                  <div className="mb-3 text-sm font-medium text-text-secondary">
                    {tramitesOficio.length} actuación administrativa de oficio
                  </div>
                  <div className="space-y-3">
                    {tramitesOficio.map((tramite) => (
                      <TramiteCard
                        key={tramite.orden}
                        tramite={tramite}
                        defaultOpen={false}
                        estadoInfo={undefined}
                        comunidad={params.comunidad}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
            <ResumenPanel plan={plan} params={params} />
            
            <div className="no-print flex flex-col gap-4">
              {expediente && (
                <div className="rounded-2xl border border-border bg-surface p-2 shadow-sm">
                  <Tabs defaultValue="validacion">
                    <TabsList className="w-full">
                      <TabsTrigger value="validacion" className="w-full">
                        <ShieldCheck size={14} className="mr-2" aria-hidden />
                        Validación
                      </TabsTrigger>
                      <TabsTrigger value="documentos" className="w-full">
                        <FileText size={14} className="mr-2" aria-hidden />
                        Documentos
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="validacion" className="mt-2">
                      <ValidadorPanel expedienteId={expediente.id} />
                    </TabsContent>
                    <TabsContent value="documentos" className="mt-2">
                      <DocumentosPanel expedienteId={expediente.id} tipoInstalacion={params.tipo_instalacion} />
                    </TabsContent>
                  </Tabs>
                </div>
              )}
              {expediente && (
                <DetallesExpediente
                  expedienteId={expediente.id}
                  referenciaCliente={expediente.referenciaCliente}
                  notas={expediente.notas}
                />
              )}
              {expediente && <PortalClienteCard expedienteId={expediente.id} />}
              {expediente && <DocumentosClientePanel expedienteId={expediente.id} />}
              {expediente && <HistorialPanel expedienteId={expediente.id} />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
