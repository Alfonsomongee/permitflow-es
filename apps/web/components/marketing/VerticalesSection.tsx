import { Zap, Wind, Droplets, Flame, Car } from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";
import { COBERTURA_NORMATIVA } from "@/content/cobertura_normativa";
import { COMUNIDAD_LABEL } from "@/types/plan";

/** Las 5 claves de vertical tal y como las usa el motor normativo real
 * (apps/api/motor_normativo/reglas/{comunidad}/{vertical}.json). */
const VERTICALES_CLAVE = [
  "fotovoltaica_autoconsumo",
  "irve",
  "climatizacion_aerotermia",
  "acs",
  "gas_baja_presion",
] as const;

/**
 * Deriva la cobertura real por comunidad desde content/cobertura_normativa.ts
 * (generado desde los 85 ficheros de reglas), en vez de una lista mantenida
 * a mano que podía quedar desincronizada de la normativa real sin que nadie
 * lo notara. "full" solo si las 5 verticales están verificadas sin huecos
 * críticos; el resto se etiqueta "partial" (normativa activa, en ampliación).
 */
function nivelCoberturaCCAA(slug: string): "full" | "partial" {
  const combos = COBERTURA_NORMATIVA[slug];
  if (!combos) return "partial";
  const todasVerificadas = VERTICALES_CLAVE.every((vertical) => {
    const c = combos[vertical];
    if (!c) return false;
    const estadoNoVerificado = (c.estado ?? "").includes("no_verificado");
    return c.nivelVerificacion === "verificada" && !estadoNoVerificado;
  });
  return todasVerificadas ? "full" : "partial";
}

const CCAA_COBERTURA = Object.entries(COMUNIDAD_LABEL).map(([slug, nombre]) => ({
  nombre,
  nivel: nivelCoberturaCCAA(slug),
}));

const VERTICALES = [
  {
    icon: Zap,
    label: "Fotovoltaica autoconsumo",
    desc: "Régimen de autorizaciones vs. PUES. Umbral de 100 kW. 17 CC. AA.",
    disponible: true,
    ccaa: 17,
  },
  {
    icon: Car,
    label: "Recarga VE (IRVE)",
    desc: "Diferenciación PUES / TECI. Registro MITECO. MOVES III.",
    disponible: true,
    ccaa: 1,
  },
  {
    icon: Wind,
    label: "Climatización y aerotermia",
    desc: "RITE, RSIF y F-Gas. Inspecciones periódicas OCA.",
    disponible: true,
    ccaa: 1,
  },
  {
    icon: Droplets,
    label: "ACS y legionella",
    desc: "RITE, Prevención de Legionella. Mantenimiento y registros.",
    disponible: true,
    ccaa: 1,
  },
  {
    icon: Flame,
    label: "Gas baja presión",
    desc: "Norma UNE, Certificados IRG. Presión normal y 5+ bar.",
    disponible: true,
    ccaa: 1,
  },
];

export function VerticalesSection() {
  return (
    <>
      {/* Verticales */}
      <section id="verticales" className="border-b border-border bg-bg py-16">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-secondary">
              Verticales disponibles
            </p>
            <h2 className="mb-10 text-3xl font-medium tracking-tight text-text-primary">
              Cinco tecnologías. Un solo motor.
            </h2>
          </FadeIn>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {VERTICALES.map(({ icon: Icon, label, desc, ccaa }, idx) => (
              <FadeIn key={label} delay={idx * 0.1}>
                <div className="flex h-full flex-col gap-3 rounded-xl border border-border bg-surface p-5 transition-all hover:shadow-md hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light">
                      <Icon size={18} className="text-primary" aria-hidden />
                    </div>
                    <span className="text-xs text-text-secondary">
                      {ccaa === 1 ? "Andalucía" : `${ccaa} CC. AA.`}
                    </span>
                  </div>
                  <div className="mt-auto">
                    <p className="text-sm font-medium text-text-primary">{label}</p>
                    <p className="mt-1 text-xs text-text-secondary leading-relaxed">{desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}

            {/* Card "próximamente" */}
            <FadeIn delay={VERTICALES.length * 0.1}>
              <div className="flex h-full flex-col gap-3 rounded-xl border border-dashed border-border bg-bg p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface">
                  <span className="text-lg">⚡</span>
                </div>
                <div className="mt-auto">
                  <p className="text-sm font-medium text-text-secondary">BT Industrial</p>
                  <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                    Instalaciones de baja tensión en entornos industriales. Próximamente.
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Cobertura autonómica */}
      <section id="cobertura" className="border-b border-border bg-surface py-16">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-secondary">
              Cobertura autonómica
            </p>
            <h2 className="mb-3 text-3xl font-medium tracking-tight text-text-primary">
              Las 17 comunidades, en progreso
            </h2>
            <p className="mb-8 max-w-lg text-sm text-text-secondary leading-relaxed">
              Andalucía es hoy la única comunidad con los cinco verticales
              verificados sin huecos normativos pendientes. El resto ya tiene
              fotovoltaica de autoconsumo operativa, y se amplía y verifica de
              forma continua mediante el pipeline BOE automatizado.
            </p>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="flex flex-wrap gap-2">
              {CCAA_COBERTURA.map(({ nombre, nivel }) => (
                <span
                  key={nombre}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/50 ${
                    nivel === "full"
                      ? "border-primary/30 bg-primary-light text-primary"
                      : "border-border bg-bg text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {nombre}
                  {nivel === "full" && (
                    <span className="ml-1.5 text-[10px] opacity-70">5 verticales</span>
                  )}
                </span>
              ))}
            </div>
          </FadeIn>

          {/* Leyenda */}
          <FadeIn delay={0.3}>
            <div className="mt-5 flex gap-5 text-xs text-text-secondary">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
                Todos los verticales
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-border" aria-hidden />
                Fotovoltaica
              </span>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
