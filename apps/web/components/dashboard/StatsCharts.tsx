"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

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

export function StatsCharts({ tendencia, estados }: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Area chart — tendencia */}
      <div className="lg:col-span-2 rounded-xl border border-border bg-surface p-5">
        <h3 className="mb-4 text-sm font-semibold text-text-primary">Tendencia de Expedientes</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={tendencia} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradCreados" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1B4FD8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#1B4FD8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradResueltos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16A34A" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid rgba(0,0,0,0.1)",
                fontSize: "12px",
              }}
            />
            <Area type="monotone" dataKey="creados" name="Creados" stroke="#1B4FD8" fill="url(#gradCreados)" strokeWidth={2} />
            <Area type="monotone" dataKey="resueltos" name="Resueltos" stroke="#16A34A" fill="url(#gradResueltos)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Donut chart — estados */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h3 className="mb-4 text-sm font-semibold text-text-primary">Por Estado</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={estados}
              dataKey="cantidad"
              nameKey="estado"
              cx="50%"
              cy="45%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
            >
              {estados.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid rgba(0,0,0,0.1)",
                fontSize: "12px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
