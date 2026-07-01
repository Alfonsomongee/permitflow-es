import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ExpedientesTable } from "@/components/dashboard/ExpedientesTable";
import { KpiGrid } from "@/components/dashboard/KpiGrid";
import { listarExpedientes, obtenerKpis } from "@/lib/expedientes";

export default async function ExpedientesPage() {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/sign-in");
  }

  const [dbExpedientes, kpis] = await Promise.all([
    listarExpedientes(orgId),
    obtenerKpis(orgId),
  ]);

  const expedientesUI = dbExpedientes.map((expediente) => ({
    id: expediente.id,
    tipo_instalacion: expediente.tipo_instalacion,
    comunidad: expediente.comunidad,
    municipio: expediente.municipio,
    potencia_kw: expediente.potencia_kw,
    estado: expediente.estado,
    tramites_total: expediente.plan_tramitacion?.tramites?.length ?? 0,
    tramites_completados: expediente.tramites_completados,
    fecha_creacion: expediente.creado_en,
    fecha_actualizacion: expediente.actualizado_en,
    cliente: expediente.referencia_cliente ?? undefined,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-medium text-text-primary">Expedientes</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            {expedientesUI.length === 0
              ? "Aun no has generado ningun plan de tramitacion."
              : `${expedientesUI.length} expedientes activos.`}
          </p>
        </div>
        <Link
          href="/nueva-instalacion"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus size={15} aria-hidden />
          Nueva instalacion
        </Link>
      </div>

      <div className="mb-6">
        <KpiGrid kpis={kpis} />
      </div>

      <ExpedientesTable expedientes={expedientesUI} />
    </div>
  );
}
