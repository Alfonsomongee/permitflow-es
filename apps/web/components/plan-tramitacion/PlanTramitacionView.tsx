"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3 } from "lucide-react";
import {
  type InstalacionParams,
  type PlanTramitacion,
  COMUNIDAD_LABEL,
  TIPO_LABEL,
} from "@/types/plan";
import { TramiteCard } from "./TramiteCard";
import { ResumenPanel } from "./ResumenPanel";
import { ExportPdfButton } from "./ExportPdfButton";

type ExpedienteEstado =
  | "borrador"
  | "pendiente"
  | "en_revision"
  | "aprobado"
  | "rechazado";

interface PlanTramitacionViewProps {
  plan: PlanTramitacion;
  params: InstalacionParams;
  expediente?: {
    id: string;
    estado: ExpedienteEstado;
    tramitesCompletados: number;
    creadoEn: string;
    actualizadoEn: string;
  };
}

const ESTADO_LABEL: Record<ExpedienteEstado, string> = {
  borrador: "Borrador",
  pendiente: "Pendiente",
  en_revision: "En revision",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

function formatDate(value?: string): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function PlanTramitacionView({
  plan,
  params,
  expediente,
}: PlanTramitacionViewProps) {
  const titulo = TIPO_LABEL[params.tipo_instalacion] ?? params.tipo_instalacion;
  const ccaa = COMUNIDAD_LABEL[params.comunidad] ?? params.comunidad;
  const subtitulo = [titulo, ccaa, params.municipio, `${params.potencia_kw} kW`]
    .filter(Boolean)
    .join(" - ");
  const progreso =
    expediente && plan.tramites.length > 0
      ? Math.round((expediente.tramitesCompletados / plan.tramites.length) * 100)
      : 0;
  const fechaActualizacion = formatDate(expediente?.actualizadoEn);

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/expedientes"
            className="flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft size={15} aria-hidden />
            Expedientes
          </Link>
          <span className="text-border">|</span>
          <div>
            <span className="text-sm font-medium text-text-primary">{titulo}</span>
            <span className="mx-2 text-text-secondary">-</span>
            <span className="text-sm text-text-secondary">{ccaa}</span>
          </div>
        </div>

        <ExportPdfButton titulo={titulo} />
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-medium text-text-primary">
              Plan de tramitacion
            </h1>
            <p className="mt-1 text-sm text-text-secondary">{subtitulo}</p>
          </div>

          {expediente && (
            <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
              <div className="rounded-lg border border-border bg-surface px-3 py-2">
                <p className="text-[11px] uppercase tracking-wider text-text-secondary">
                  Estado
                </p>
                <p className="mt-0.5 text-sm font-medium text-text-primary">
                  {ESTADO_LABEL[expediente.estado]}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface px-3 py-2">
                <p className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-text-secondary">
                  <CheckCircle2 size={12} aria-hidden />
                  Progreso
                </p>
                <p className="mt-0.5 text-sm font-medium text-text-primary">
                  {expediente.tramitesCompletados}/{plan.tramites.length} ({progreso}%)
                </p>
              </div>
              {fechaActualizacion && (
                <div className="rounded-lg border border-border bg-surface px-3 py-2">
                  <p className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-text-secondary">
                    <Clock3 size={12} aria-hidden />
                    Actualizado
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-text-primary">
                    {fechaActualizacion}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-3">
            {plan.tramites.map((tramite, i) => (
              <TramiteCard
                key={tramite.orden}
                tramite={tramite}
                defaultOpen={i < 2}
              />
            ))}
          </div>

          <div className="lg:sticky lg:top-[61px] lg:self-start">
            <ResumenPanel plan={plan} params={params} />
          </div>
        </div>
      </main>
    </div>
  );
}
