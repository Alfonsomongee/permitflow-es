"use client";

/**
 * apps/web/components/marketing/PreciosSection.tsx
 *
 * Sección de precios para la landing page.
 * Los price IDs apuntan a productos reales de Stripe —
 * créalos en Stripe Dashboard y ponlos en .env.
 */
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Check, Loader2 } from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";
import { crearSesionCheckoutPro } from "@/lib/stripe/checkout";

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
      "Andalucía — 5 verticales verificados",
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
    // Si ya hay sesión, el botón dispara el checkout de Stripe directamente
    // (ver PreciosSection() más abajo). Si no, /sign-up?redirect_url=/ajustes
    // -- Clerk respeta ese query param por defecto y así, tras registrarse,
    // el usuario aterriza en la pestaña Organización de Ajustes, que ya
    // tiene el mismo botón de upgrade funcional (auditoría UX 2026-08-21;
    // antes este enlace llevaba a "/sign-up?plan=pro", un query param que
    // no se leía en ningún sitio del repo -- no existía ningún camino real
    // de Free a Pro).
    ctaHref: "/sign-up?redirect_url=%2Fajustes",
    destacado: true,
    features: [
      "Clasificaciones ilimitadas",
      "17 CC. AA. — motor activo en los 5 verticales, en verificación continua",
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

function PlanCta({ plan }: { plan: (typeof PLANES)[number] }) {
  const { isSignedIn } = useAuth();
  const [iniciando, setIniciando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claseBase = `mb-1 block w-full rounded-lg py-2.5 text-center text-sm font-medium transition-opacity ${
    plan.destacado
      ? "bg-primary text-white hover:opacity-90"
      : "border border-border text-text-primary hover:bg-bg"
  }`;

  // Con sesión activa, el plan Pro dispara el checkout de Stripe
  // directamente en vez de reenviar a /sign-up (que para un usuario ya
  // registrado no lleva a ningún sitio útil).
  if (plan.nombre === "Pro" && isSignedIn) {
    const iniciarCheckout = async () => {
      setError(null);
      setIniciando(true);
      try {
        window.location.href = await crearSesionCheckoutPro();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo iniciar el proceso de pago.");
        setIniciando(false);
      }
    };
    return (
      <div className="mb-5">
        <button onClick={iniciarCheckout} disabled={iniciando} className={`${claseBase} inline-flex items-center justify-center gap-1.5 disabled:opacity-60`}>
          {iniciando && <Loader2 size={14} className="animate-spin" />}
          Actualizar a Pro
        </button>
        {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <Link href={plan.ctaHref} className="mb-5 block">
      <span className={claseBase}>{plan.cta}</span>
    </Link>
  );
}

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
        <FadeIn>
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
        </FadeIn>

        <div className="grid gap-4 lg:grid-cols-3">
          {PLANES.map((plan, idx) => (
            <FadeIn key={plan.nombre} delay={idx * 0.1}>
              <div
                className={`relative flex h-full flex-col rounded-2xl p-[1px] transition-transform duration-300 hover:-translate-y-1 ${
                  plan.destacado ? "bg-gradient-to-br from-primary via-primary/40 to-primary shadow-md" : ""
                }`}
              >
                <div
                  className={`flex h-full flex-col rounded-2xl border p-6 ${
                    plan.destacado
                      ? "border-transparent bg-surface"
                      : "border-border bg-surface transition-shadow hover:shadow-sm"
                  }`}
                >
                {plan.destacado && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-white shadow-sm">
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

                <PlanCta plan={plan} />

                <ul className="flex flex-col gap-2.5 mt-auto">
                  {plan.features.map((f) => (
                    <FeatureItem key={f} text={f} available />
                  ))}
                  {plan.disabled.map((f) => (
                    <FeatureItem key={f} text={f} available={false} />
                  ))}
                </ul>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.4}>
          <p className="mt-6 text-center text-xs text-text-secondary">
            Todos los planes incluyen Andalucía con sus cinco verticales
            totalmente verificados; el resto de comunidades se amplían y
            verifican de forma continua. Precios sin IVA.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
