/**
 * apps/web/app/(dashboard)/expedientes/page.tsx
 *
 * Dashboard principal de expedientes.
 * Usa datos mock hasta que haya autenticación y persistencia en base de datos.
 */
import Link from "next/link";
import { Plus } from "lucide-react";
import { KpiGrid } from "@/components/dashboard/KpiGrid";
import { ExpedientesTable } from "@/components/dashboard/ExpedientesTable";
import { EXPEDIENTES_MOCK } from "@/components/dashboard/types";

export default function ExpedientesPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Cabecera */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-text-primary">Expedientes</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Gestión y seguimiento de tramitaciones activas.
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

      {/* KPIs */}
      <div className="mb-6">
        <KpiGrid expedientes={EXPEDIENTES_MOCK} />
      </div>

      {/* Tabla */}
      <ExpedientesTable expedientes={EXPEDIENTES_MOCK} />
    </div>
  );
}
