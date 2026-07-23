import { AlertTriangle, Building2, Gauge, ListChecks, MapPin, Zap } from "lucide-react";
import {
  type InstalacionParams,
  type PlanTramitacion,
  COMUNIDAD_LABEL,
  TIPO_LABEL,
} from "@/types/plan";

interface ResumenPanelProps {
  params: InstalacionParams;
  plan: PlanTramitacion;
}

function ParamRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof MapPin;
  label: string;
  value?: string | number | boolean | null;
}) {
  if (value === undefined || value === null || value === "") return null;
  const display = typeof value === "boolean" ? (value ? "Sí" : "No") : String(value);

  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="flex items-center gap-2 text-text-secondary">
        {Icon && <Icon size={13} className="flex-shrink-0" aria-hidden />}
        {label}
      </span>
      <span className="max-w-[150px] truncate text-right font-medium text-text-primary">{display}</span>
    </div>
  );
}

export function ResumenPanel({ params, plan }: ResumenPanelProps) {
  const organismos = new Set(plan.tramites.map((tramite) => tramite.organismo)).size;

  return (
    <aside className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          <Zap size={12} aria-hidden />
          Instalación
        </p>
        <div className="divide-y divide-border/70">
          <ParamRow icon={Building2} label="Tipo" value={TIPO_LABEL[params.tipo_instalacion] ?? params.tipo_instalacion} />
          <ParamRow icon={MapPin} label="CC. AA." value={COMUNIDAD_LABEL[params.comunidad] ?? params.comunidad} />
          <ParamRow label="Municipio" value={params.municipio} />
          <ParamRow icon={Gauge} label="Potencia" value={`${params.potencia_kw} kW`} />
          {params.numero_puntos && <ParamRow label="Puntos de recarga" value={params.numero_puntos} />}
          {params.modo_recarga && <ParamRow label="Modo de recarga" value={`Modo ${params.modo_recarga}`} />}
          {params.ubicacion_irve && <ParamRow label="Ubicación" value={params.ubicacion_irve.replace(/_/g, " ")} />}
          {params.acceso_publico !== undefined && (
            <ParamRow label="Acceso" value={params.acceso_publico ? "Público (TECI/MITECO)" : "Privado (PUES)"} />
          )}
          {params.solicita_ayuda && <ParamRow label="Solicita ayuda" value="Sí (MOVES III / Next Gen)" />}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary-light to-surface p-5">
        <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary-dark">
          <ListChecks size={12} aria-hidden />
          Resumen del plan
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface/70 p-3">
            <p className="text-2xl font-bold text-text-primary">{plan.tramites.length}</p>
            <p className="text-[11px] text-text-secondary">trámites</p>
          </div>
          {plan.tiempo_total_estimado_dias !== null && (
            <div className="rounded-xl bg-surface/70 p-3">
              <p className="text-2xl font-bold text-text-primary">~{plan.tiempo_total_estimado_dias}</p>
              <p className="text-[11px] text-text-secondary">días estimados</p>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-text-secondary">
          Repartidos entre <span className="font-medium text-text-primary">{organismos}</span> organismos distintos.
        </p>
      </div>

      {plan.advertencias.length > 0 && (
        <div className="space-y-2">
          {plan.advertencias.map((advertencia, index) => (
            <div
              key={index}
              className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning-light px-4 py-3 text-xs leading-relaxed text-warning-dark"
            >
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" aria-hidden />
              {advertencia}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
