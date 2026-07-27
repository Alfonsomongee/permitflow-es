import { StatsKPICards } from "@/components/dashboard/StatsKPICards";
import { StatsCharts } from "@/components/dashboard/StatsCharts";
import { StatsExpedientesTableWrapper } from "@/components/dashboard/StatsExpedientesTableWrapper";
import type { KPIData } from "@/components/dashboard/StatsKPICards";
import type { TendenciaData, EstadoData } from "@/components/dashboard/StatsCharts";

// Datos de demo hasta conectar con Supabase
const DEMO_KPIS: KPIData = {
  total_expedientes: 127,
  tasa_aprobacion: 84,
  tiempo_medio_dias: 23,
  tipos_activos: 5,
};

const DEMO_TENDENCIA: TendenciaData[] = [
  { mes: "Ene", creados: 8, resueltos: 5 },
  { mes: "Feb", creados: 11, resueltos: 9 },
  { mes: "Mar", creados: 14, resueltos: 12 },
  { mes: "Abr", creados: 18, resueltos: 15 },
  { mes: "May", creados: 22, resueltos: 19 },
  { mes: "Jun", creados: 16, resueltos: 14 },
  { mes: "Jul", creados: 20, resueltos: 17 },
];

const DEMO_ESTADOS: EstadoData[] = [
  { estado: "Aprobado", cantidad: 68, color: "#16A34A" },
  { estado: "En revisión", cantidad: 31, color: "#D97706" },
  { estado: "Subsanación", cantidad: 14, color: "#DC2626" },
  { estado: "Presentado", cantidad: 14, color: "#1B4FD8" },
];

export default function EstadisticasPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Estadísticas</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Resumen de actividad y rendimiento de tus expedientes de tramitación.
        </p>
      </div>

      <StatsKPICards data={DEMO_KPIS} />

      <StatsCharts tendencia={DEMO_TENDENCIA} estados={DEMO_ESTADOS} />

      <StatsExpedientesTableWrapper />
    </div>
  );
}
