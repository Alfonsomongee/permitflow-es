import Link from "next/link";
import { ArrowRight, ClipboardList, Cpu, ListChecks } from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";

const PASOS = [
  {
    num: "01",
    icon: ClipboardList,
    titulo: "Describe la instalación",
    desc: "Selecciona el tipo de instalación, la comunidad autónoma y los parámetros técnicos clave (potencia, uso, modo de recarga…).",
  },
  {
    num: "02",
    icon: Cpu,
    titulo: "El motor evalúa la normativa",
    desc: "El evaluador de reglas json-logic cruza tus parámetros con los árboles de decisión de cada CC. AA. en tiempo real.",
  },
  {
    num: "03",
    icon: ListChecks,
    titulo: "Recibes el plan de tramitación",
    desc: "Una lista ordenada de trámites con organismo, plataforma (PUES / TECI / MITECO), documentos requeridos y plazos estimados.",
  },
];

export function ComoFuncionaSection() {
  return (
    <>
      {/* Cómo funciona */}
      <section id="como-funciona" className="border-b border-border bg-bg py-16">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-secondary">
              Cómo funciona
            </p>
            <h2 className="mb-10 text-3xl font-medium tracking-tight text-text-primary">
              De la instalación al trámite en tres pasos
            </h2>
          </FadeIn>

          <div className="grid gap-6 lg:grid-cols-3">
            {PASOS.map(({ num, icon: Icon, titulo, desc }, idx) => (
              <FadeIn key={num} delay={idx * 0.15}>
                <div className="group flex flex-col gap-4 rounded-2xl border border-transparent p-1 transition-colors hover:border-border hover:bg-surface hover:shadow-card">
                  {/* Icono + número + línea */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary transition-transform duration-300 group-hover:scale-110">
                      <Icon size={18} aria-hidden />
                    </div>
                    <span className="font-mono text-2xl font-medium text-primary/30 transition-colors group-hover:text-primary">
                      {num}
                    </span>
                    <div className="h-px flex-1 bg-border transition-colors group-hover:bg-primary/20" aria-hidden />
                  </div>
                  <div className="px-1 pb-2">
                    <h3 className="text-base font-medium text-text-primary">{titulo}</h3>
                    <p className="mt-1.5 text-sm text-text-secondary leading-relaxed">{desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-primary py-16">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <FadeIn>
            <h2 className="mb-3 text-3xl font-medium tracking-tight text-white">
              Empieza a tramitar sin fricciones
            </h2>
            <p className="mx-auto mb-8 max-w-md text-sm text-white/70 leading-relaxed">
              Prueba el clasificador ahora con una instalación real. Sin registro,
              sin tarjeta. El resultado en segundos.
            </p>
            <Link
              href="/nueva-instalacion"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-primary shadow-sm transition-transform hover:scale-105"
            >
              Clasificar mi instalación
              <ArrowRight size={15} aria-hidden />
            </Link>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
