/* eslint-disable @typescript-eslint/no-unused-vars */
import { FileText, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import type { Expediente, EstadoExpediente } from "./types";

interface KpiCardProps {
  label: string;
  value: number | string;
  sublabel?: string;
  accent?: "default" | "warning" | "success" | "primary";
}

function KpiCard({ label, value, sublabel, accent = "default" }: KpiCardProps) {
  const accentColor = {
    default: "text-text-primary",
    warning: "text-warning",
    success: "text-success",
    primary: "text-primary",
  }[accent];

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className={`mt-1.5 text-3xl font-medium tracking-tight ${accentColor}`}>
        {value}
      </p>
      {sublabel && (
        <p className="mt-1 text-xs text-text-secondary">{sublabel}</p>
      )}
    </div>
  );
}

interface KpiGridProps {
  expedientes: Expediente[];
}

export function KpiGrid({ expedientes }: KpiGridProps) {
  const total = expedientes.length;
  const enTramitacion = expedientes.filter(
    (e) => e.estado === "pendiente" || e.estado === "en_revision"
  ).length;
  const aprobados = expedientes.filter((e) => e.estado === "aprobado").length;
  const borradores = expedientes.filter((e) => e.estado === "borrador").length;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard label="Total expedientes" value={total} />
      <KpiCard
        label="En tramitación"
        value={enTramitacion}
        sublabel="pendiente + en revisión"
        accent="warning"
      />
      <KpiCard
        label="Aprobados"
        value={aprobados}
        sublabel="tramitación completada"
        accent="success"
      />
      <KpiCard
        label="Borradores"
        value={borradores}
        sublabel="sin enviar"
        accent="primary"
      />
    </div>
  );
}
