import { AlertTriangle } from "lucide-react";
import {
  type InstalacionParams,
  type PlanTramitacion,
  TIPO_LABEL,
  COMUNIDAD_LABEL,
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
    <div className="py-3 border-b border-border last:border-0">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="mt-0.5 text-xl font-medium text-text-primary">{value}</p>
    </div>
  );
}

function ParamRow({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (value === undefined || value === null || value === "") return null;
  const display =
    typeof value === "boolean" ? (value ? "Sí" : "No") : String(value);
  return (
    <div className="flex justify-between items-start gap-2 py-1.5 text-xs border-b border-border last:border-0">
      <span className="text-text-secondary">{label}</span>
      <span className="text-text-primary font-medium text-right max-w-[140px]">{display}</span>
    </div>
  );
}

export function ResumenPanel({ params, plan }: ResumenPanelProps) {
  const organismos = new Set(plan.tramites.map((t) => t.organismo)).size;

  return (
    <aside className="flex flex-col gap-4">
      {/* Resumen de la instalación */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
          Instalación
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
              label="Ubicación"
              value={params.ubicacion_irve.replace(/_/g, " ")}
            />
          )}
          {params.acceso_publico !== undefined && (
            <ParamRow
              label="Acceso"
              value={params.acceso_publico ? "Público (TECI/MITECO)" : "Privado (PUES)"}
            />
          )}
          {params.solicita_ayuda && (
            <ParamRow label="Solicita ayuda" value="Sí (MOVES III / Next Gen)" />
          )}
        </div>
      </div>

      {/* Métricas del plan */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
          Resumen del plan
        </p>
        <MetricRow label="Trámites en total" value={plan.tramites.length} />
        {plan.tiempo_total_estimado_dias !== null && (
          <MetricRow
            label="Tiempo estimado"
            value={`~${plan.tiempo_total_estimado_dias} días`}
          />
        )}
        <MetricRow label="Organismos distintos" value={organismos} />
      </div>

      {/* Advertencias del motor */}
      {plan.advertencias.length > 0 && (
        <div className="space-y-2">
          {plan.advertencias.map((adv, i) => (
            <div
              key={i}
              className="flex gap-2.5 items-start rounded-lg border border-warning bg-warning/10 px-3 py-2.5 text-xs text-warning-dark leading-relaxed"
            >
              <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" aria-hidden />
              {adv}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
