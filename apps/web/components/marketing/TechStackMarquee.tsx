/**
 * apps/web/components/marketing/TechStackMarquee.tsx
 *
 * Marquee horizontal infinito con el stack tecnológico real del proyecto
 * (coincide con apps/web/package.json y apps/api/pyproject.toml — no es una
 * lista decorativa). Sin logos de marca: al no tener los SVG oficiales
 * verificados de cada tecnología, se usan badges de texto en vez de arriesgar
 * un uso incorrecto de marca. Animación en CSS puro (sin JS ni librería de
 * marquee), pausable al pasar el ratón.
 */
const STACK = [
  "Next.js 14",
  "TypeScript",
  "Tailwind CSS",
  "FastAPI",
  "Python",
  "PostgreSQL",
  "Supabase",
  "Clerk",
  "Stripe",
  "DeepSeek",
  "Framer Motion",
  "json-logic",
];

function Badges({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <div className="flex flex-shrink-0 items-center gap-3 pr-3" aria-hidden={ariaHidden}>
      {STACK.map((tech) => (
        <span
          key={tech}
          className="flex-shrink-0 rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium text-text-secondary shadow-xs"
        >
          {tech}
        </span>
      ))}
    </div>
  );
}

export function TechStackMarquee() {
  return (
    <section className="border-b border-border bg-bg py-10">
      <div className="mx-auto max-w-6xl px-6">
        <p className="mb-5 text-center text-xs font-medium uppercase tracking-wider text-text-secondary">
          Construido sobre un stack moderno y probado
        </p>
      </div>
      <div
        className="relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
      >
        <div className="flex animate-marquee">
          {/* Contenido duplicado para un loop continuo sin salto visible */}
          <Badges />
          <Badges ariaHidden />
        </div>
      </div>
    </section>
  );
}
