import { type Plataforma, PLATAFORMA_LABEL } from "@/types/plan";
import { Building2, Globe, Zap, FileText } from "lucide-react";
import React from "react";

const PLATAFORMA_CONFIG: Record<
  string,
  { bg: string; text: string; border: string; icon: React.ElementType }
> = {
  PUES: { bg: "bg-primary-light", text: "text-primary-dark", border: "border-primary/20", icon: FileText },
  TECI: { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200", icon: FileText },
  MITECO: { bg: "bg-teal-50", text: "text-teal-800", border: "border-teal-200", icon: Globe },
  distribuidora: { bg: "bg-warning-light", text: "text-warning-dark", border: "border-warning/20", icon: Zap },
  ayuntamiento: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200", icon: Building2 },
};

const DEFAULT_CONFIG = { bg: "bg-surface", text: "text-text-secondary", border: "border-border", icon: FileText };

interface PlataformaBadgeProps {
  plataforma: Plataforma;
}

export function PlataformaBadge({ plataforma }: PlataformaBadgeProps) {
  if (!plataforma) return null;
  const config = PLATAFORMA_CONFIG[plataforma] ?? DEFAULT_CONFIG;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-0.5 text-[11px] font-semibold ${config.bg} ${config.text} ${config.border}`}>
      <Icon size={10} aria-hidden="true" />
      {PLATAFORMA_LABEL[plataforma] ?? plataforma}
    </span>
  );
}
