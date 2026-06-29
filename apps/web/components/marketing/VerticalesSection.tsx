import { Zap, Wind, Droplets, Flame, Car } from "lucide-react";

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

const CCAA_COBERTURA = [
  { nombre: "Andalucía",       nivel: "full"    },
  { nombre: "Aragón",          nivel: "partial" },
  { nombre: "Asturias",        nivel: "partial" },
  { nombre: "Baleares",        nivel: "partial" },
  { nombre: "Canarias",        nivel: "partial" },
  { nombre: "Cantabria",       nivel: "partial" },
  { nombre: "Castilla-La Mancha", nivel: "partial" },
  { nombre: "Castilla y León", nivel: "partial" },
  { nombre: "Cataluña",        nivel: "partial" },
  { nombre: "C. Valenciana",   nivel: "partial" },
  { nombre: "Extremadura",     nivel: "partial" },
  { nombre: "Galicia",         nivel: "partial" },
  { nombre: "La Rioja",        nivel: "partial" },
  { nombre: "Madrid",          nivel: "partial" },
  { nombre: "Murcia",          nivel: "partial" },
  { nombre: "Navarra",         nivel: "partial" },
  { nombre: "País Vasco",      nivel: "partial" },
] as const;

export function VerticalesSection() {
  return (
    <>
      {/* Verticales */}
      <section id="verticales" className="border-b border-border bg-bg py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-secondary">
            Verticales disponibles
          </p>
          <h2 className="mb-10 text-3xl font-medium tracking-tight text-text-primary">
            Cinco tecnologías. Un solo motor.
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {VERTICALES.map(({ icon: Icon, label, desc, ccaa }) => (
              <div
                key={label}
                className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light">
                    <Icon size={18} className="text-primary" aria-hidden />
                  </div>
                  <span className="text-xs text-text-secondary">
                    {ccaa === 1 ? "Andalucía" : `${ccaa} CC. AA.`}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{label}</p>
                  <p className="mt-1 text-xs text-text-secondary leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}

            {/* Card "próximamente" */}
            <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-bg p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface">
                <span className="text-lg">⚡</span>
              </div>
              <div>
                <p className="text-sm font-medium text-text-secondary">BT Industrial</p>
                <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                  Instalaciones de baja tensión en entornos industriales. Próximamente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cobertura autonómica */}
      <section id="cobertura" className="border-b border-border bg-surface py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-secondary">
            Cobertura autonómica
          </p>
          <h2 className="mb-3 text-3xl font-medium tracking-tight text-text-primary">
            Las 17 comunidades, en progreso
          </h2>
          <p className="mb-8 max-w-lg text-sm text-text-secondary leading-relaxed">
            Andalucía cuenta con los cinco verticales completos. El resto de
            comunidades disponen de fotovoltaica de autoconsumo y se amplían
            continuamente mediante el pipeline BOE automatizado.
          </p>

          <div className="flex flex-wrap gap-2">
            {CCAA_COBERTURA.map(({ nombre, nivel }) => (
              <span
                key={nombre}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  nivel === "full"
                    ? "border-primary/30 bg-primary-light text-primary"
                    : "border-border bg-bg text-text-secondary"
                }`}
              >
                {nombre}
                {nivel === "full" && (
                  <span className="ml-1.5 text-[10px] opacity-70">5 verticales</span>
                )}
              </span>
            ))}
          </div>

          {/* Leyenda */}
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
        </div>
      </section>
    </>
  );
}
