/**
 * apps/web/app/(dashboard)/expedientes/page.tsx
 *
 * Dashboard conectado a Supabase — reemplaza la versión con datos mock.
 */
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { listarExpedientes, obtenerKpis } from "@/lib/expedientes";
import { KpiGrid } from "@/components/dashboard/KpiGrid";
import { ExpedientesTable } from "@/components/dashboard/ExpedientesTable";

export default async function ExpedientesPage() {
  const { orgId } = await auth();

  // Sin organización: redirige a crear/seleccionar organización en Clerk
  if (!orgId) {
    redirect("/sign-in");
  }

  const [dbExpedientes, kpis] = await Promise.all([
    listarExpedientes(orgId),
    obtenerKpis(orgId),
  ]);

  const expedientesUI = dbExpedientes.map((e) => ({
    id: e.id,
    tipo_instalacion: e.tipo_instalacion,
    comunidad: e.comunidad,
    municipio: e.municipio,
    potencia_kw: e.potencia_kw,
    estado: e.estado,
    tramites_total: e.plan_tramitacion?.tramites?.length ?? 0,
    tramites_completados: e.tramites_completados,
    fecha_creacion: e.creado_en,
    fecha_actualizacion: e.actualizado_en,
    cliente: e.referencia_cliente ?? undefined,
  }));

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-text-primary">Expedientes</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            {expedientesUI.length === 0
              ? "Aún no has generado ningún plan de tramitación."
              : `${expedientesUI.length} expedientes activos.`}
          </p>
        </div>
        <Link
          href="/nueva-instalacion"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus size={15} aria-hidden />
          Nueva instalación
        </Link>
      </div>

      <div className="mb-6">
        <KpiGrid kpis={kpis} />
      </div>

      <ExpedientesTable expedientes={expedientesUI} />
    </div>
  );
}
