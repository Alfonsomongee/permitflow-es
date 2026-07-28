import Link from "next/link";
import { ArrowRight, Zap, FileText, CheckCircle2, Clock } from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";
import { SplitText } from "@/components/ui/split-text";
import { CountUp } from "@/components/ui/count-up";

const STATS = [
  { value: 5,  prefix: "",    suffix: "",   label: "verticales completos en Andalucía" },
  { value: 17, prefix: "",    suffix: "",   label: "comunidades autónomas con fotovoltaica" },
  { value: 2,  prefix: "< ",  suffix: " s", label: "para generar el plan de tramitación" },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-surface">
      {/* Elemento de fondo decorativo */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-surface to-surface" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-6 py-12 md:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
          
          {/* Columna Izquierda: Texto */}
          <div className="flex flex-col items-start">
            <FadeIn delay={0.1}>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-light px-3 py-1.5">
                <Zap size={12} className="text-primary" aria-hidden />
                <span className="text-xs font-medium text-primary">
                  Motor normativo · 17 CC. AA. · 5 verticales
                </span>
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <h1 className="mb-5 text-4xl sm:text-5xl lg:text-6xl font-medium leading-[1.1] tracking-tight text-text-primary">
                <SplitText
                  text="El trámite correcto,"
                  delay={0.3}
                  stagger={0.07}
                />
                {" "}
                <SplitText
                  text="a la primera"
                  delay={0.55}
                  stagger={0.08}
                  className="text-primary"
                />
              </h1>
            </FadeIn>

            <FadeIn delay={0.3}>
              <p className="mb-8 max-w-xl text-lg text-text-secondary leading-relaxed">
                PermitFlow clasifica cualquier instalación técnica en segundos y genera
                el plan de tramitación exacto para tu comunidad autónoma, sin buscar
                en el BOE.
              </p>
            </FadeIn>

            <FadeIn delay={0.4}>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/nueva-instalacion"
                  className="flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90 hover:shadow-md hover:-translate-y-0.5"
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
            </FadeIn>
          </div>

          {/* Columna Derecha: Gráfico/Mock UI */}
          <div className="hidden lg:block relative">
            <FadeIn delay={0.5} className="relative z-10 mx-auto w-full max-w-md rounded-2xl border border-border bg-bg/50 p-6 shadow-xl backdrop-blur-sm">
              <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h3 className="font-medium text-text-primary">Autoconsumo Residencial</h3>
                  <p className="text-xs text-text-secondary">Sevilla, Andalucía · &lt; 10kW</p>
                </div>
                <div className="rounded-md bg-success/10 px-2 py-1 text-xs font-medium text-success">
                  Aprobado
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-3 rounded-lg border border-border bg-surface p-3 shadow-sm">
                  <div className="mt-0.5 text-primary"><FileText size={16} /></div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Comunicación previa (PUES)</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-text-secondary">
                      <Clock size={12} /> 15 días estimados
                    </div>
                  </div>
                  <div className="ml-auto mt-0.5 text-success"><CheckCircle2 size={16} /></div>
                </div>

                <div className="flex gap-3 rounded-lg border border-border bg-surface p-3 shadow-sm opacity-60">
                  <div className="mt-0.5 text-text-secondary"><FileText size={16} /></div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Licencia de obras</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-text-secondary">
                      Exento por Decreto 141/2012
                    </div>
                  </div>
                  <div className="ml-auto mt-0.5 text-border"><CheckCircle2 size={16} /></div>
                </div>
              </div>
            </FadeIn>

            {/* Elementos flotantes de fondo */}
            <FadeIn delay={0.7} className="absolute -right-6 -bottom-6 -z-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
            <FadeIn delay={0.6} className="absolute -left-6 -top-6 -z-10 h-32 w-32 rounded-full bg-success/10 blur-2xl" />
          </div>

        </div>
      </div>

      {/* Stats bar */}
      <div className="relative border-t border-border bg-surface/50 backdrop-blur-sm">
        <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {STATS.map(({ value, prefix, suffix, label }, idx) => (
            <FadeIn key={label} delay={0.6 + idx * 0.1} className="px-8 py-6">
              <p className="text-3xl font-medium tracking-tight text-text-primary">
                <CountUp to={value} prefix={prefix} suffix={suffix} duration={1600} />
              </p>
              <p className="mt-1 text-sm text-text-secondary">{label}</p>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
