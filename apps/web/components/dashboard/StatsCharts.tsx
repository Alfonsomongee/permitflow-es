"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";

export type TendenciaData = {
  mes: string;
  creados: number;
  resueltos: number;
};

export type EstadoData = {
  estado: string;
  cantidad: number;
  color: string;
};

type Props = {
  tendencia: TendenciaData[];
  estados: EstadoData[];
};

const tendenciaConfig = {
  creados: {
    label: "Creados",
    color: "hsl(var(--primary))",
  },
  resueltos: {
    label: "Resueltos",
    color: "hsl(var(--success))",
  },
} satisfies ChartConfig;

const estadosConfig = {
  "Aprobado": {
    label: "Aprobado",
    color: "hsl(var(--success))",
  },
  "En revisión": {
    label: "En revisión",
    color: "hsl(var(--warning))",
  },
  "Subsanación": {
    label: "Subsanación",
    color: "hsl(var(--danger))",
  },
  "Presentado": {
    label: "Presentado",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function StatsCharts({ tendencia, estados }: Props) {
  // Add fill field based on ChartConfig to feed to Recharts Pie
  const chartDataEstados = estados.map((item) => ({
    ...item,
    fill: estadosConfig[item.estado as keyof typeof estadosConfig]?.color || "hsl(var(--muted))",
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Area chart — tendencia */}
      <div className="lg:col-span-2 rounded-xl border border-border bg-surface p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-text-primary">Tendencia de Expedientes</h3>
        
        <ChartContainer config={tendenciaConfig} className="h-[250px] w-full">
          <AreaChart data={tendencia} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="fillCreados" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-creados)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-creados)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fillResueltos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-resueltos)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-resueltos)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="mes"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
            <Area
              type="monotone"
              dataKey="resueltos"
              stackId="a"
              fill="url(#fillResueltos)"
              stroke="var(--color-resueltos)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="creados"
              stackId="a"
              fill="url(#fillCreados)"
              stroke="var(--color-creados)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </div>

      {/* Donut chart — estados */}
      <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-text-primary">Por Estado</h3>
        <ChartContainer config={estadosConfig} className="mx-auto aspect-square h-[250px]">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartDataEstados}
              dataKey="cantidad"
              nameKey="estado"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={3}
              stroke="hsl(var(--background))"
              strokeWidth={2}
            />
            <ChartLegend
              content={<ChartLegendContent />}
              className="flex-wrap gap-2 text-[11px]"
            />
          </PieChart>
        </ChartContainer>
      </div>
    </div>
  );
}
