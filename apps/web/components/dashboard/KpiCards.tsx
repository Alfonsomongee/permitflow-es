"use client";

import { useCounterAnimation } from "@/hooks/useCounterAnimation";
import React from "react";

export type KPIData = {
  total_expedientes: number;
  tasa_aprobacion: number;
  tiempo_medio_dias: number;
  tipos_activos: number;
};

export interface KpiItem {
  label: string;
  value: number;
  icon?: React.ReactNode;
  suffix?: string;
  subtext?: string;
  accent?: "default" | "warning" | "success" | "primary" | "danger";
}

function KpiCard({
  icon,
  label,
  value,
  suffix,
  subtext,
  accent = "default",
}: KpiItem) {
  const animatedValue = useCounterAnimation(value);

  const accentColor = {
    default: "text-text-primary",
    warning: "text-warning",
    success: "text-success",
    primary: "text-primary",
    danger: "text-danger",
  }[accent];

  const bgAccentColor = {
    default: "bg-text-secondary/10 text-text-secondary",
    warning: "bg-warning/10 text-warning",
    success: "bg-success/10 text-success",
    primary: "bg-primary/10 text-primary",
    danger: "bg-danger/10 text-danger",
  }[accent];

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
          {label}
        </span>
        {icon && (
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${bgAccentColor}`}>
            {icon}
          </span>
        )}
      </div>
      <p className={`tabular-nums text-3xl font-bold tracking-tight ${accentColor}`}>
        {animatedValue.toLocaleString("es-ES")}
        {suffix && <span className="ml-1 text-lg font-normal text-text-secondary">{suffix}</span>}
      </p>
      {subtext && <p className="mt-1 text-xs text-text-secondary">{subtext}</p>}
    </div>
  );
}

export function KpiCards({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <KpiCard key={item.label} {...item} />
      ))}
    </div>
  );
}
