/**
 * apps/web/components/marketing/PreciosSection.tsx
 *
 * Sección de precios para la landing page.
 * Los price IDs apuntan a productos reales de Stripe —
 * créalos en Stripe Dashboard y ponlos en .env.
 */
import Link from "next/link";
import { Check } from "lucide-react";

const PLANES = [
  {
    nombre: "Free",
    precio: "0 €",
    periodo: "para siempre",
    descripcion: "Para explorar el motor normativo.",
    cta: "Empezar gratis",
    ctaHref: "/sign-up",
    destacado: false,
    features: [
      "5 clasificaciones al mes",
      "Andalucía — 5 verticales",
      "Plan de tramitación completo",
      "Bot normativo DeepSeek",
      "Sin exportar a PDF",
    ],
    disabled: ["Exportar PDF", "Historial de expedientes", "Alertas BOE", "Multi-usuario"],
  },
  {
    nombre: "Pro",
    precio: "49 €",
    periodo: "/ mes por empresa",
    descripcion: "Para instaladoras y gestorías activas.",
    cta: "Empezar prueba gratis",
    ctaHref: "/sign-up?plan=pro",
    destacado: true,
    features: [
      "Clasificaciones ilimitadas",
      "17 CC. AA. — todos los verticales",
      "Exportar plan a PDF",
      "Historial ilimitado de expedientes",
      "Alertas BOE en tiempo real",
      "Bot normativo con contexto completo",
      "Hasta 5 usuarios por empresa",
      "Soporte por email",
    ],
    disabled: [],
  },
  {
    nombre: "Enterprise",
    precio: "Consultar",
    periodo: "",
    descripcion: "Para promotoras y grandes instaladoras.",
    cta: "Contactar",
    ctaHref: "mailto:hola@permitflow.es",
    destacado: false,
    features: [
      "Todo lo de Pro",
      "Usuarios ilimitados",
      "SLA garantizado",
      "Integración API propia",
      "Onboarding personalizado",
      "Normativa a medida por CCAA",
    ],
    disabled: [],
  },
];

function FeatureItem({ text, available = true }: { text: string; available?: boolean }) {
  return (
    <li className={`flex items-start gap-2.5 text-sm ${available ? "text-text-secondary" : "text-text-secondary/40 line-through"}`}>
      <Check
        size={14}
        className={`mt-0.5 flex-shrink-0 ${available ? "text-success" : "text-border"}`}
        aria-hidden
      />
      {text}
    </li>
  );
}

export function PreciosSection() {
  return (
    <section id="precios" className="border-b border-border bg-bg py-16">
      <div className="mx-auto max-w-6xl px-6">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-secondary">
          Precios
        </p>
        <h2 className="mb-3 text-3xl font-medium tracking-tight text-text-primary">
          Transparente desde el primer día
        </h2>
        <p className="mb-10 max-w-lg text-sm text-text-secondary leading-relaxed">
          Empieza gratis con 5 clasificaciones al mes. Sin tarjeta de crédito.
          Escala cuando tu equipo crezca.
        </p>

        <div className="grid gap-4 lg:grid-cols-3">
          {PLANES.map((plan) => (
            <div
              key={plan.nombre}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                plan.destacado
                  ? "border-primary bg-surface shadow-sm"
                  : "border-border bg-surface"
              }`}
            >
              {plan.destacado && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-white">
                    Más popular
                  </span>
                </div>
              )}

              <div className="mb-5">
                <p className="text-sm font-medium text-text-secondary">{plan.nombre}</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-medium text-text-primary">{plan.precio}</span>
                  {plan.periodo && (
                    <span className="text-sm text-text-secondary">{plan.periodo}</span>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-text-secondary">{plan.descripcion}</p>
              </div>

              <Link
                href={plan.ctaHref}
                className={`mb-5 block rounded-lg py-2.5 text-center text-sm font-medium transition-opacity ${
                  plan.destacado
                    ? "bg-primary text-white hover:opacity-90"
                    : "border border-border text-text-primary hover:bg-bg"
                }`}
              >
                {plan.cta}
              </Link>

              <ul className="flex flex-col gap-2.5">
                {plan.features.map((f) => (
                  <FeatureItem key={f} text={f} available />
                ))}
                {plan.disabled.map((f) => (
                  <FeatureItem key={f} text={f} available={false} />
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-text-secondary">
          Todos los planes incluyen acceso al motor normativo de Andalucía completo.
          Precios sin IVA.
        </p>
      </div>
    </section>
  );
}
