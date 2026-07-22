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

export function PlazosActivos({ plazos, estancados }: PlazosActivosProps) {
  if (plazos.length === 0 && estancados.length === 0) return null;

  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-2">
      {plazos.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
            <CalendarClock size={12} aria-hidden />
            Plazos legales en curso
          </p>
          <ul className="flex flex-col gap-1">
            {plazos.map((p) => {
              const vencido = p.diasRestantes < 0;
              const proximo = !vencido && p.diasRestantes <= 7;
              return (
                <li key={`${p.expedienteId}-${p.tramiteNombre}`}>
                  <Link
                    href={`/expedientes/${p.expedienteId}`}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-bg"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-text-primary">
                        {p.tramiteNombre}
                      </span>
                      <span className="block truncate text-xs text-text-secondary">
                        {p.etiqueta}
                      </span>
                    </span>
                    <span
                      className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                        vencido
                          ? "bg-danger-light text-danger-dark"
                          : proximo
                            ? "bg-warning-light text-warning-dark"
                            : "bg-success-light text-success-dark"
                      }`}
                    >
                      {vencido
                        ? `vencido ${Math.abs(p.diasRestantes)}d`
                        : `quedan ${p.diasRestantes}d de ${p.plazoLegal}`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {estancados.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
            <PauseCircle size={12} aria-hidden />
            Sin movimiento
          </p>
          <ul className="flex flex-col gap-1">
            {estancados.map((e) => (
              <li key={e.expedienteId}>
                <Link
                  href={`/expedientes/${e.expedienteId}`}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-bg"
                >
                  <span className="truncate text-sm text-text-primary">
                    {e.etiqueta}
                  </span>
                  <span className="flex-shrink-0 rounded-full bg-warning-light px-2.5 py-0.5 text-[11px] font-medium text-warning-dark">
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
