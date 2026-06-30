"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { type PlanTramitacion, type InstalacionParams, TIPO_LABEL, COMUNIDAD_LABEL } from "@/types/plan";
import { TramiteCard } from "./TramiteCard";
import { ResumenPanel } from "./ResumenPanel";
import { ExportPdfButton } from "./ExportPdfButton";

interface PlanTramitacionViewProps {
  plan: PlanTramitacion;
  params: InstalacionParams;
}

export function PlanTramitacionView({ plan, params }: PlanTramitacionViewProps) {
  const router = useRouter();

  const titulo = TIPO_LABEL[params.tipo_instalacion] ?? params.tipo_instalacion;
  const ccaa = COMUNIDAD_LABEL[params.comunidad] ?? params.comunidad;
  const subtitulo = [titulo, ccaa, params.municipio, `${params.potencia_kw} kW`]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="min-h-screen bg-bg">
      {/* Topbar */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={15} aria-hidden />
            Volver
          </button>
          <span className="text-border">|</span>
          <div>
            <span className="text-sm font-medium text-text-primary">{titulo}</span>
            <span className="mx-2 text-text-secondary">·</span>
            <span className="text-sm text-text-secondary">{ccaa}</span>
          </div>
        </div>

        <ExportPdfButton titulo={titulo} />
      </header>

      {/* Contenido principal */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Título de sección */}
        <div className="mb-6">
          <h1 className="text-xl font-medium text-text-primary">
            Plan de tramitación
          </h1>
          <p className="mt-1 text-sm text-text-secondary">{subtitulo}</p>
        </div>

        {/* Layout: lista de trámites + panel lateral */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          {/* Lista de trámites */}
          <div className="space-y-3">
            {plan.tramites.map((tramite, i) => (
              <TramiteCard
                key={tramite.orden}
                tramite={tramite}
                defaultOpen={i < 2}
              />
            ))}
          </div>

          {/* Panel de resumen — sticky en escritorio */}
          <div className="lg:sticky lg:top-[61px] lg:self-start">
            <ResumenPanel plan={plan} params={params} />
          </div>
        </div>
      </main>
    </div>
  );
}
