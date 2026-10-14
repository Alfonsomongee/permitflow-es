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
import { Button, buttonVariants } from "@/components/ui/button";
import { crearSesionCheckoutPro } from "@/lib/stripe/checkout";
import { LIMITE_CLASIFICACIONES_FREE_MES } from "@/lib/planes";
import { resumenCobertura } from "@/lib/cobertura-resumen";

// Cada línea de esta tabla debe corresponderse con algo que el producto hace de
// verdad (auditoría 2026-10-01, F-01/F-11): la cuota Free se aplica en
// app/api/clasificar (lib/planes.ts) y los documentos y el validador están
// protegidos por plan en sus rutas. Se retiraron promesas sin respaldo ("Alertas
// BOE en tiempo real", "Integración API propia", "Hasta 5 usuarios", "SLA").
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
      `${LIMITE_CLASIFICACIONES_FREE_MES} clasificaciones al mes`,
      "Plan de tramitación con la base legal de cada trámite",
      "Nivel de verificación visible por comunidad y tecnología",
      "Alertas de cambios normativos del BOE",
      "Asistente normativo con uso diario limitado",
      "Presupuesto en PDF con marca PermitFlow",
    ],
    disabled: ["Documentos descargables (plan, checklist, MTD, dossier)", "Validador pre-presentación"],
  },
  {
    nombre: "Pro",
    precio: "49 €",
    periodo: "/ mes por empresa",
    descripcion: "Para instaladoras y gestorías activas.",
    cta: "Empezar con Pro",
    // Con sesión, el botón dispara el checkout de Stripe (ver PlanCta). Sin
    // sesión, /sign-up respeta redirect_url y aterriza en Ajustes, que tiene el
    // mismo botón de upgrade.
    ctaHref: "/sign-up?redirect_url=%2Fajustes",
    destacado: true,
    features: [
      "Clasificaciones ilimitadas",
      "Todo lo del plan Free",
      "Documentos descargables: plan, checklist, MTD y dossier",
      "Validador pre-presentación",
      "Presupuesto en PDF con la marca de tu empresa",
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
    ctaHref: "/contacto",
    destacado: false,
    features: [
      "Todo lo de Pro",
      "Usuarios ilimitados",
      "Onboarding personalizado",
      "Normativa a medida por comunidad autónoma",
    ],
    disabled: [],
  },
];

const RESUMEN = resumenCobertura();

function PlanCta({ plan }: { plan: (typeof PLANES)[number] }) {
  const { isSignedIn } = useAuth();
  const [iniciando, setIniciando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const variant = plan.destacado ? "default" : "outline";

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
        <Button variant={variant} size="lg" onClick={iniciarCheckout} disabled={iniciando} className="w-full">
          {iniciando && <Loader2 size={14} className="animate-spin" />}
          Actualizar a Pro
        </Button>
        {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <Link href={plan.ctaHref} className={`${buttonVariants({ variant, size: "lg" })} mb-5 w-full`}>
      {plan.cta}
    </Link>
  );
}

function FeatureItem({ text, available = true }: { text: string; available?: boolean }) {
  return (
    <li className={`flex items-start gap-2.5 text-sm ${available ? "text-text-secondary" : "text-text-secondary line-through"}`}>
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
            Empieza gratis con {LIMITE_CLASIFICACIONES_FREE_MES} clasificaciones al mes. Sin tarjeta de crédito.
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
            Todos los planes incluyen las {RESUMEN.comunidades} comunidades autónomas y las {RESUMEN.verticales} tecnologías.
            Hoy {RESUMEN.verificadas + RESUMEN.parciales} de {RESUMEN.combinaciones} combinaciones tienen verificación
            total o parcial; el resto son borradores que cada plan marca como tales y conviene contrastar con el
            organismo antes de presentar. Precios sin IVA.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
