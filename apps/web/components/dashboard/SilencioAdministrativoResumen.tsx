import Link from "next/link";
import { Scale } from "lucide-react";
import type { EfectoSilencio } from "@/lib/silencioAdministrativo";

export interface SilencioResumenItem {
  expedienteId: string;
  etiqueta: string;
  nombreTramite: string;
  efecto: EfectoSilencio;
  diasVencido: number;
}

interface SilencioAdministrativoResumenProps {
  items: SilencioResumenItem[];
}

/**
 * Resumen a nivel de cartera de los trámites detectados por
 * lib/silencioAdministrativo.ts::detectarSilenciosVencidos en cualquier
 * expediente de la organización. Mismo criterio de honestidad que el
 * banner por expediente (SilencioAdministrativoBanner): solo aparecen
 * trámites con silencio_administrativo verificado a mano.
 *
 * Vive como su propia tarjeta, separada de PlazosActivos: un plazo vencido
 * en silencio no es "un plazo más que contar", es un hecho jurídico ya
 * ocurrido con una consecuencia concreta -- merece su propio espacio, no
 * competir por sitio con "estancados" en la misma rejilla de dos columnas.
 */
export function SilencioAdministrativoResumen({ items }: SilencioAdministrativoResumenProps) {
  if (items.length === 0) return null;

  const expedientesAfectados = new Set(items.map((i) => i.expedienteId)).size;

  return (
    <div className="mb-6 rounded-xl border border-danger/30 bg-danger-light p-4 shadow-sm">
      <div className="flex items-start gap-2.5">
        <Scale size={14} className="mt-0.5 flex-shrink-0 text-danger-dark" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-danger-dark">
            {items.length === 1
              ? `1 trámite ha vencido en silencio administrativo`
              : `${items.length} trámites han vencido en silencio administrativo`}{" "}
            {expedientesAfectados > 1 && (
              <span className="font-normal">en {expedientesAfectados} expedientes</span>
            )}
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {items.map((item, i) => (
              <li key={`${item.expedienteId}-${item.nombreTramite}-${i}`}>
                <Link
                  href={`/expedientes/${item.expedienteId}`}
                  className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-xs text-danger-dark transition-colors hover:bg-surface/60"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{item.etiqueta}</span>
                    {" · "}
                    {item.nombreTramite}
                  </span>
                  <span className="flex-shrink-0 rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                    silencio {item.efecto}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
