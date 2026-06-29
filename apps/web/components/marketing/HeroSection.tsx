import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";

const STATS = [
  { num: "5",     label: "verticales completos en Andalucía" },
  { num: "17",    label: "comunidades autónomas con fotovoltaica" },
  { num: "< 2 s", label: "para generar el plan de tramitación" },
];

export function HeroSection() {
  return (
    <section className="border-b border-border bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-20">
        {/* Eyebrow */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-light px-3 py-1.5">
          <Zap size={12} className="text-primary" aria-hidden />
          <span className="text-xs font-medium text-primary">
            Motor normativo · 17 CC. AA. · 5 verticales
          </span>
        </div>

        {/* Headline */}
        <h1 className="mb-5 max-w-2xl text-5xl font-medium leading-[1.1] tracking-tight text-text-primary">
          El trámite correcto,{" "}
          <span className="text-primary">a la primera</span>
        </h1>

        {/* Subline */}
        <p className="mb-8 max-w-xl text-lg text-text-secondary leading-relaxed">
          PermitFlow clasifica cualquier instalación técnica en segundos y genera
          el plan de tramitación exacto para tu comunidad autónoma, sin buscar
          en el BOE.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/nueva-instalacion"
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Clasificar instalación
            <ArrowRight size={15} aria-hidden />
          </Link>
          <Link
            href="#como-funciona"
            className="rounded-lg border border-border px-5 py-3 text-sm text-text-secondary transition-colors hover:bg-bg hover:text-text-primary"
          >
            Ver cómo funciona
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-t border-border">
        <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {STATS.map(({ num, label }) => (
            <div key={label} className="px-8 py-6">
              <p className="text-3xl font-medium tracking-tight text-text-primary">{num}</p>
              <p className="mt-1 text-sm text-text-secondary">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
