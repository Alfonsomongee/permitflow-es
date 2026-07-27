import Link from "next/link";
import { CalendarClock, PauseCircle } from "lucide-react";

export interface PlazoActivo {
  expedienteId: string;
  etiqueta: string;
  tramiteNombre: string;
  diasRestantes: number;
  plazoLegal: number;
}

export interface ExpedienteEstancado {
  expedienteId: string;
  etiqueta: string;
  diasSinMovimiento: number;
}

interface PlazosActivosProps {
  plazos: PlazoActivo[];
  estancados: ExpedienteEstancado[];
}

function ProgressBarPlazo({
  diasRestantes,
  plazoLegal,
}: {
  diasRestantes: number;
  plazoLegal: number;
}) {
  const consumido = Math.max(0, plazoLegal - diasRestantes);
  const pctConsumido = Math.min(100, Math.round((consumido / plazoLegal) * 100));
  
  const vencido = diasRestantes < 0;
  const proximo = !vencido && diasRestantes <= 7;
  
  const bgColor = vencido ? "bg-danger" : proximo ? "bg-warning" : "bg-success";

  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full transition-all ${bgColor}`}
          style={{ width: `${vencido ? 100 : pctConsumido}%` }}
        />
      </div>
      <span
        className={`flex-shrink-0 text-[10px] font-medium ${
          vencido
            ? "text-danger"
            : proximo
              ? "text-warning"
              : "text-success"
        }`}
      >
        {vencido
          ? `vencido por ${Math.abs(diasRestantes)}d`
          : `${diasRestantes}d restantes`}
      </span>
    </div>
  );
}

export function PlazosActivos({ plazos, estancados }: PlazosActivosProps) {
  if (plazos.length === 0 && estancados.length === 0) return null;

  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-2">
      {plazos.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
            <CalendarClock size={12} aria-hidden />
            Plazos legales en curso
          </p>
          <ul className="flex flex-col gap-1">
            {plazos.map((p) => {
              return (
                <li key={`${p.expedienteId}-${p.tramiteNombre}`}>
                  <Link
                    href={`/expedientes/${p.expedienteId}`}
                    className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-bg/50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-text-primary">
                          {p.tramiteNombre}
                        </span>
                        <span className="block truncate text-xs text-text-secondary">
                          {p.etiqueta}
                        </span>
                      </span>
                    </div>
                    <ProgressBarPlazo
                      diasRestantes={p.diasRestantes}
                      plazoLegal={p.plazoLegal}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {estancados.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
            <PauseCircle size={12} aria-hidden />
            Sin movimiento
          </p>
          <ul className="flex flex-col gap-1">
            {estancados.map((e) => (
              <li key={e.expedienteId}>
                <Link
                  href={`/expedientes/${e.expedienteId}`}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-bg/50"
                >
                  <span className="truncate text-sm font-medium text-text-primary">
                    {e.etiqueta}
                  </span>
                  <span className="flex-shrink-0 rounded-full bg-warning/10 px-2.5 py-0.5 text-[11px] font-medium text-warning">
                    {e.diasSinMovimiento} días parado
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
