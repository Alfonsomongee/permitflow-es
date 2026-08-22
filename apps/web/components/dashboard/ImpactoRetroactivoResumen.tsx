import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import type { ExpedienteConImpactoRetroactivo } from "@/lib/alertas";

/**
 * Resumen a nivel de cartera de expedientes con normativa verificada
 * aplicada después de su creación (roadmap de mejoras, PREM-08). Mismo
 * criterio visual que SilencioAdministrativoResumen: es un hecho ya
 * ocurrido con consecuencia real ("tu plan pudo quedar desactualizado"),
 * no un aviso informativo más -- vive en su propia tarjeta, en rojo, no
 * mezclado con PlazosActivos.
 */
export function ImpactoRetroactivoResumen({
  items,
}: {
  items: ExpedienteConImpactoRetroactivo[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-danger/30 bg-danger-light p-4 shadow-sm">
      <div className="flex items-start gap-2.5">
        <ShieldAlert size={14} className="mt-0.5 flex-shrink-0 text-danger-dark" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-danger-dark">
            {items.length === 1
              ? "1 expediente puede tener el plan desactualizado"
              : `${items.length} expedientes pueden tener el plan desactualizado`}
          </p>
          <p className="mt-1 text-xs text-danger-dark/80">
            Normativa verificada y aplicada al motor DESPUÉS de crear estos expedientes. El plan
            guardado pudo generarse con la versión anterior.
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {items.map(({ expediente, alertas }) => (
              <li key={expediente.id}>
                <Link
                  href={`/expedientes/${expediente.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-xs text-danger-dark transition-colors hover:bg-surface/60"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-medium">
                      {expediente.referencia_cliente ?? expediente.tipo_instalacion}
                    </span>
                    {" · "}
                    {alertas[0].titulo}
                    {alertas.length > 1 && ` +${alertas.length - 1} más`}
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
