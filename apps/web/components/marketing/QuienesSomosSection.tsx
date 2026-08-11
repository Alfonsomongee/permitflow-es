/**
 * apps/web/components/marketing/QuienesSomosSection.tsx
 *
 * Sección "Quiénes somos" en formato bento grid. Deliberadamente sin fotos de
 * stock ni testimonios: el contenido son hechos verificables del propio
 * producto (cifras reales del motor normativo, funcionamiento del pipeline
 * BOE, y el compromiso de transparencia sobre niveles de verificación que ya
 * existe en el código, no una promesa de marketing).
 */
import { Target, ShieldCheck, Newspaper, ListChecks, ArrowRight } from "lucide-react";
import Link from "next/link";
import { FadeIn } from "@/components/ui/fade-in";

const PRINCIPIOS = [
  "Cada trámite lleva su base legal citada, no una referencia genérica.",
  "Cuando la normativa autonómica aún no está verificada, lo decimos — no lo ocultamos.",
  "El pipeline BOE sugiere cambios; una persona los revisa antes de aplicarlos al motor.",
];

export function QuienesSomosSection() {
  return (
    <section id="quienes-somos" className="border-b border-border bg-surface py-16">
      <div className="mx-auto max-w-6xl px-6">
        <FadeIn>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-secondary">
            Quiénes somos
          </p>
          <h2 className="mb-10 max-w-2xl text-3xl font-medium tracking-tight text-text-primary">
            Un motor normativo, no una promesa de marketing
          </h2>
        </FadeIn>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
          {/* Misión — card grande */}
          <FadeIn delay={0.1} className="sm:col-span-2 lg:col-span-2 lg:row-span-2">
            <div className="flex h-full flex-col justify-between gap-6 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary-light via-surface to-surface p-7 shadow-card">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
                <Target size={19} aria-hidden />
              </div>
              <div>
                <h3 className="mb-2.5 text-xl font-medium tracking-tight text-text-primary">
                  Nuestra misión
                </h3>
                <p className="text-sm leading-relaxed text-text-secondary">
                  La fragmentación normativa entre comunidades autónomas obliga
                  a instaladoras y gestorías a invertir horas manuales en
                  averiguar qué trámites y documentos necesita cada
                  instalación. PermitFlow convierte ese proceso en un motor de
                  reglas que clasifica cualquier instalación técnica y genera
                  el plan de tramitación exacto, con su base legal, en
                  segundos — no en horas de búsqueda en el BOE.
                </p>
              </div>
              <Link
                href="/nueva-instalacion"
                className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Ver el motor en acción
                <ArrowRight size={14} aria-hidden />
              </Link>
            </div>
          </FadeIn>

          {/* Cifra real del motor */}
          <FadeIn delay={0.2}>
            <div className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-border bg-bg p-6 shadow-card">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light text-primary">
                <ListChecks size={17} aria-hidden />
              </div>
              <div>
                <p className="text-3xl font-medium tabular-nums tracking-tight text-text-primary">
                  85
                </p>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                  combinaciones comunidad × tecnología evaluadas por el motor
                  normativo (17 CC. AA. × 5 verticales), cada una con su
                  propio nivel de verificación.
                </p>
              </div>
            </div>
          </FadeIn>

          {/* Transparencia normativa */}
          <FadeIn delay={0.3}>
            <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-bg p-6 shadow-card">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light text-primary">
                <ShieldCheck size={17} aria-hidden />
              </div>
              <div>
                <h3 className="mb-1.5 text-sm font-medium text-text-primary">
                  Transparencia normativa
                </h3>
                <p className="text-xs leading-relaxed text-text-secondary">
                  Cada plan indica si su normativa está verificada, verificada
                  con observaciones, o aún en borrador — con los huecos
                  concretos listados, no un aviso genérico.
                </p>
              </div>
            </div>
          </FadeIn>

          {/* Pipeline BOE */}
          <FadeIn delay={0.4} className="sm:col-span-2 lg:col-span-2">
            <div className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-border bg-bg p-6 shadow-card sm:flex-row sm:items-center">
              <div className="flex items-start gap-3.5">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
                  <Newspaper size={17} aria-hidden />
                </div>
                <div>
                  <h3 className="mb-1 text-sm font-medium text-text-primary">
                    Pipeline BOE automatizado
                  </h3>
                  <p className="max-w-md text-xs leading-relaxed text-text-secondary">
                    Monitoriza el BOE y los boletines autonómicos, analiza los
                    cambios relevantes y propone actualizaciones al motor —
                    siempre con revisión humana antes de aplicarse.
                  </p>
                </div>
              </div>
              <span className="flex-shrink-0 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-medium text-text-secondary">
                Lunes y jueves
              </span>
            </div>
          </FadeIn>
        </div>

        {/* Cómo trabajamos */}
        <FadeIn delay={0.5}>
          <div className="mt-4 rounded-2xl border border-border bg-bg p-6">
            <h3 className="mb-4 text-sm font-medium text-text-primary">Cómo trabajamos</h3>
            <ul className="grid gap-3 sm:grid-cols-3">
              {PRINCIPIOS.map((principio) => (
                <li key={principio} className="flex items-start gap-2 text-xs leading-relaxed text-text-secondary">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-primary" aria-hidden />
                  {principio}
                </li>
              ))}
            </ul>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
