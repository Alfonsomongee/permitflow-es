interface Kpis {
  total: number;
  en_tramitacion: number;
  aprobados: number;
  borradores: number;
}

interface KpiCardProps {
  label: string;
  value: number;
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

export function KpiGrid({ kpis }: { kpis: Kpis }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard label="Total expedientes" value={kpis.total} />
      <KpiCard
        label="En tramitación"
        value={kpis.en_tramitacion}
        sublabel="pendiente + en revisión"
        accent="warning"
      />
      <KpiCard
        label="Aprobados"
        value={kpis.aprobados}
        sublabel="tramitación completada"
        accent="success"
      />
      <KpiCard
        label="Borradores"
        value={kpis.borradores}
        sublabel="sin enviar"
        accent="primary"
      />
    </div>
  );
}
