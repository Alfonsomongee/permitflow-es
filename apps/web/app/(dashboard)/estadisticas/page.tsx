import { KpiCards } from "@/components/dashboard/KpiCards";
import { StatsCharts } from "@/components/dashboard/StatsCharts";
import { ExpedientesTable } from "@/components/dashboard/ExpedientesTable";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { listarExpedientes } from "@/lib/expedientes";
import { FileText, CheckCircle, Clock, TrendingUp } from "lucide-react";

import { DEMO_KPIS, DEMO_TENDENCIA, DEMO_ESTADOS } from "@/lib/demo-data";

export default async function EstadisticasPage() {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/sign-in");
  }

  const dbExpedientes = await listarExpedientes(orgId);
  const expedientesUI = dbExpedientes.map((expediente) => ({
    id: expediente.id,
    tipo_instalacion: expediente.tipo_instalacion,
    comunidad: expediente.comunidad,
    potencia_kw: expediente.potencia_kw,
    estado: expediente.estado,
    tramites_total: expediente.plan_tramitacion?.tramites?.length ?? 0,
    tramites_completados: expediente.tramites_completados,
    fecha_creacion: expediente.creado_en,
    fecha_actualizacion: expediente.actualizado_en,
    cliente: expediente.referencia_cliente ?? undefined,
  }));
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Estadísticas</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Resumen de actividad y rendimiento de tus expedientes de tramitación.
        </p>
      </div>

      <KpiCards
        items={[
          {
            icon: <FileText size={16} />,
            label: "Total Expedientes",
            value: DEMO_KPIS.total_expedientes,
            subtext: "En la plataforma",
          },
          {
            icon: <CheckCircle size={16} />,
            label: "Tasa de Éxito",
            value: DEMO_KPIS.tasa_aprobacion,
            suffix: "%",
            subtext: "Expedientes aprobados",
            accent: "success",
          },
          {
            icon: <Clock size={16} />,
            label: "Tiempo Medio",
            value: DEMO_KPIS.tiempo_medio_dias,
            suffix: "días",
            subtext: "De tramitación",
          },
          {
            icon: <TrendingUp size={16} />,
            label: "Tecnologías Activas",
            value: DEMO_KPIS.tipos_activos,
            subtext: "Tipos en gestión",
            accent: "primary",
          },
        ]}
      />

      <StatsCharts tendencia={DEMO_TENDENCIA} estados={DEMO_ESTADOS} />

      <ExpedientesTable expedientes={expedientesUI} />
    </div>
  );
}
