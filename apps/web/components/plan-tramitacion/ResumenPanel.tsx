import { AlertTriangle } from "lucide-react";
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

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="border-b border-border py-3 last:border-0">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="mt-0.5 text-xl font-medium text-text-primary">{value}</p>
    </div>
  );
}

function ParamRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | boolean | null;
}) {
  if (value === undefined || value === null || value === "") return null;
  const display = typeof value === "boolean" ? (value ? "Si" : "No") : String(value);

  return (
    <div className="flex items-start justify-between gap-2 border-b border-border py-1.5 text-xs last:border-0">
      <span className="text-text-secondary">{label}</span>
      <span className="max-w-[140px] text-right font-medium text-text-primary">
        {display}
      </span>
    </div>
  );
}

export function ResumenPanel({ params, plan }: ResumenPanelProps) {
  const organismos = new Set(plan.tramites.map((tramite) => tramite.organismo)).size;

  return (
    <aside className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
          Instalacion
        </p>
        <div>
          <ParamRow label="Tipo" value={TIPO_LABEL[params.tipo_instalacion] ?? params.tipo_instalacion} />
          <ParamRow label="CC. AA." value={COMUNIDAD_LABEL[params.comunidad] ?? params.comunidad} />
          <ParamRow label="Municipio" value={params.municipio} />
          <ParamRow label="Potencia" value={`${params.potencia_kw} kW`} />
          {params.numero_puntos && (
            <ParamRow label="Puntos de recarga" value={params.numero_puntos} />
          )}
          {params.modo_recarga && (
            <ParamRow label="Modo de recarga" value={`Modo ${params.modo_recarga}`} />
          )}
          {params.ubicacion_irve && (
            <ParamRow
              label="Ubicacion"
              value={params.ubicacion_irve.replace(/_/g, " ")}
            />
          )}
          {params.acceso_publico !== undefined && (
            <ParamRow
              label="Acceso"
              value={params.acceso_publico ? "Publico (TECI/MITECO)" : "Privado (PUES)"}
            />
          )}
          {params.solicita_ayuda && (
            <ParamRow label="Solicita ayuda" value="Si (MOVES III / Next Gen)" />
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
          Resumen del plan
        </p>
        <MetricRow label="Tramites en total" value={plan.tramites.length} />
        {plan.tiempo_total_estimado_dias !== null && (
          <MetricRow
            label="Tiempo estimado"
            value={`~${plan.tiempo_total_estimado_dias} dias`}
          />
        )}
        <MetricRow label="Organismos distintos" value={organismos} />
      </div>

      {plan.advertencias.length > 0 && (
        <div className="space-y-2">
          {plan.advertencias.map((advertencia, index) => (
            <div
              key={index}
              className="flex items-start gap-2.5 rounded-lg border border-warning bg-warning/10 px-3 py-2.5 text-xs leading-relaxed text-warning-dark"
            >
              <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" aria-hidden />
              {advertencia}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
