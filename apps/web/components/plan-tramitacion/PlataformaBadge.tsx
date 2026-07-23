import { type Plataforma, PLATAFORMA_LABEL } from "@/types/plan";

const PLATAFORMA_STYLES: Record<NonNullable<Plataforma>, { bg: string; text: string; border: string }> = {
  PUES: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
  TECI: { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" },
  MITECO: { bg: "bg-teal-50", text: "text-teal-800", border: "border-teal-200" },
  distribuidora: { bg: "bg-neutral-100", text: "text-neutral-600", border: "border-neutral-200" },
  ayuntamiento: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
};

interface PlataformaBadgeProps {
  plataforma: Plataforma;
}

export function PlataformaBadge({ plataforma }: PlataformaBadgeProps) {
  if (!plataforma) return null;
  const styles = PLATAFORMA_STYLES[plataforma];

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${styles.bg} ${styles.text} ${styles.border}`}>
      {PLATAFORMA_LABEL[plataforma] ?? plataforma}
    </span>
  );
}
