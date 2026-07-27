import type { KPIData } from "@/components/dashboard/KpiCards";
import type { TendenciaData, EstadoData } from "@/components/dashboard/StatsCharts";

export const DEMO_KPIS: KPIData = {
  total_expedientes: 127,
  tasa_aprobacion: 84,
  tiempo_medio_dias: 23,
  tipos_activos: 5,
};

export const DEMO_TENDENCIA: TendenciaData[] = [
  { mes: "Ene", creados: 8, resueltos: 5 },
  { mes: "Feb", creados: 11, resueltos: 9 },
  { mes: "Mar", creados: 14, resueltos: 12 },
  { mes: "Abr", creados: 18, resueltos: 15 },
  { mes: "May", creados: 22, resueltos: 19 },
  { mes: "Jun", creados: 16, resueltos: 14 },
  { mes: "Jul", creados: 20, resueltos: 17 },
];

export const DEMO_ESTADOS: EstadoData[] = [
  { estado: "Aprobado", cantidad: 68, color: "var(--success)" },
  { estado: "En revisión", cantidad: 31, color: "var(--warning)" },
  { estado: "Subsanación", cantidad: 14, color: "var(--danger)" },
  { estado: "Presentado", cantidad: 14, color: "var(--primary)" },
];
