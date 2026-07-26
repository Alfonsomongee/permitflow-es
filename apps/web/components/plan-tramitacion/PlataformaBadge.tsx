import { type Plataforma, PLATAFORMA_LABEL } from "@/types/plan";

// Estilo específico solo para las plataformas nacionales/comunes; el resto de
// comunidades usan nombres en texto libre (ver types/plan.ts) y caen en el
// estilo por defecto de abajo.
const PLATAFORMA_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  PUES: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
  TECI: { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" },
  MITECO: { bg: "bg-teal-50", text: "text-teal-800", border: "border-teal-200" },
  distribuidora: { bg: "bg-neutral-100", text: "text-neutral-600", border: "border-neutral-200" },
  ayuntamiento: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
};

const PLATAFORMA_STYLE_DEFAULT = { bg: "bg-neutral-100", text: "text-neutral-600", border: "border-neutral-200" };

interface PlataformaBadgeProps {
  plataforma: Plataforma;
}

export function PlataformaBadge({ plataforma }: PlataformaBadgeProps) {
  if (!plataforma) return null;
  const styles = PLATAFORMA_STYLES[plataforma] ?? PLATAFORMA_STYLE_DEFAULT;

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${styles.bg} ${styles.text} ${styles.border}`}>
      {PLATAFORMA_LABEL[plataforma] ?? plataforma}
    </span>
  );
}
