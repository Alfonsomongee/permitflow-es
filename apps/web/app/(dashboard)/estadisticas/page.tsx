import { KpiCards } from "@/components/dashboard/KpiCards";
import { StatsCharts } from "@/components/dashboard/StatsCharts";
import { ExpedientesTable } from "@/components/dashboard/ExpedientesTable";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { listarExpedientes } from "@/lib/expedientes";
import { FileText, CheckCircle, Clock, TrendingUp, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { calcularEstadisticasReales, MUESTRA_MINIMA_ORG } from "@/lib/estadisticas";

export default async function EstadisticasPage() {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/sign-in");
  }

  const dbExpedientes = await listarExpedientes(orgId);
  const { kpis, tendencia, estados, muestraInsuficiente } =
    calcularEstadisticasReales(dbExpedientes);
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

      {muestraInsuficiente && (
        <Alert className="border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle>Datos aún poco representativos</AlertTitle>
          <AlertDescription className="mt-1 text-xs">
            Tu organización tiene menos de {MUESTRA_MINIMA_ORG} expedientes registrados.
            La tasa de éxito y el tiempo medio de tramitación se calculan sobre datos
            reales, pero con tan pocos casos no son aún fiables como tendencia.
          </AlertDescription>
        </Alert>
      )}

      <KpiCards
        items={[
          {
            icon: <FileText size={16} />,
            label: "Total Expedientes",
            value: kpis.total_expedientes,
            subtext: "En la plataforma",
          },
          {
            icon: <CheckCircle size={16} />,
            label: "Tasa de Éxito",
            value: kpis.tasa_aprobacion,
            suffix: "%",
            subtext: "Sobre expedientes resueltos (aprobados o rechazados)",
            accent: "success",
          },
          {
            icon: <Clock size={16} />,
            label: "Tiempo Medio",
            value: kpis.tiempo_medio_dias,
            suffix: "días",
            subtext: "Media real de expedientes aprobados",
          },
          {
            icon: <TrendingUp size={16} />,
            label: "Tecnologías Activas",
            value: kpis.tipos_activos,
            subtext: "Tipos distintos en gestión",
            accent: "primary",
          },
        ]}
      />

      <StatsCharts tendencia={tendencia} estados={estados} />

      <ExpedientesTable expedientes={expedientesUI} />
    </div>
  );
}
