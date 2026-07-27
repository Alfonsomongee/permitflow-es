"use client";

import { TrendingUp, FileText, Clock, CheckCircle } from "lucide-react";
import { useCounterAnimation } from "@/hooks/useCounterAnimation";

export type KPIData = {
  total_expedientes: number;
  tasa_aprobacion: number;
  tiempo_medio_dias: number;
  tipos_activos: number;
};

type Props = { data: KPIData };

function KPICard({
  icon,
  label,
  value,
  suffix,
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  subtext?: string;
}) {
  const animatedValue = useCounterAnimation(value);

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
      </div>
      <p className="tabular-nums text-3xl font-bold text-text-primary">
        {animatedValue.toLocaleString("es-ES")}
        {suffix && <span className="ml-1 text-lg font-normal text-text-secondary">{suffix}</span>}
      </p>
      {subtext && <p className="mt-1 text-xs text-text-secondary">{subtext}</p>}
    </div>
  );
}

export function StatsKPICards({ data }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KPICard
        icon={<FileText size={16} />}
        label="Total Expedientes"
        value={data.total_expedientes}
        subtext="En la plataforma"
      />
      <KPICard
        icon={<CheckCircle size={16} />}
        label="Tasa de Éxito"
        value={data.tasa_aprobacion}
        suffix="%"
        subtext="Expedientes aprobados"
      />
      <KPICard
        icon={<Clock size={16} />}
        label="Tiempo Medio"
        value={data.tiempo_medio_dias}
        suffix="días"
        subtext="De tramitación"
      />
      <KPICard
        icon={<TrendingUp size={16} />}
        label="Tecnologías Activas"
        value={data.tipos_activos}
        subtext="Tipos en gestión"
      />
    </div>
  );
}
