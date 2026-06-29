import Link from "next/link";
import { ArrowRight } from "lucide-react";

const PASOS = [
  {
    num: "01",
    titulo: "Describe la instalación",
    desc: "Selecciona el tipo de instalación, la comunidad autónoma y los parámetros técnicos clave (potencia, uso, modo de recarga…).",
  },
  {
    num: "02",
    titulo: "El motor evalúa la normativa",
    desc: "El evaluador de reglas json-logic cruza tus parámetros con los árboles de decisión de cada CC. AA. en tiempo real.",
  },
  {
    num: "03",
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
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-secondary">
            Cómo funciona
          </p>
          <h2 className="mb-10 text-3xl font-medium tracking-tight text-text-primary">
            De la instalación al trámite en tres pasos
          </h2>

          <div className="grid gap-6 lg:grid-cols-3">
            {PASOS.map(({ num, titulo, desc }) => (
              <div key={num} className="flex flex-col gap-4">
                {/* Número + línea */}
                <div className="flex items-center gap-3">
                  <span className="font-mono text-2xl font-medium text-primary/30">
                    {num}
                  </span>
                  <div className="h-px flex-1 bg-border" aria-hidden />
                </div>
                <div>
                  <h3 className="text-base font-medium text-text-primary">{titulo}</h3>
                  <p className="mt-1.5 text-sm text-text-secondary leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-primary py-16">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="mb-3 text-3xl font-medium tracking-tight text-white">
            Empieza a tramitar sin fricciones
          </h2>
          <p className="mx-auto mb-8 max-w-md text-sm text-white/70 leading-relaxed">
            Prueba el clasificador ahora con una instalación real. Sin registro,
            sin tarjeta. El resultado en segundos.
          </p>
          <Link
            href="/nueva-instalacion"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-primary transition-opacity hover:opacity-90"
          >
            Clasificar mi instalación
            <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
      </section>

      {/* Footer mínimo */}
      <footer className="border-t border-border bg-surface px-6 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between text-xs text-text-secondary">
          <span>© 2026 PermitFlow ES — Prototipo TFG</span>
          <span>Motor normativo v1.0 · Andalucía completa</span>
        </div>
      </footer>
    </>
  );
}
