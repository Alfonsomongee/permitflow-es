/**
 * apps/web/components/marketing/CoberturaNormativaBanda.tsx
 *
 * Sustituye al antiguo TechStackMarquee, que desplazaba indefinidamente el
 * stack tecnológico interno del proyecto (Next.js, FastAPI, Supabase, Clerk,
 * DeepSeek, Framer Motion...) — auditoría UX/UI 2026-08-11, D-03.
 *
 * Aquel componente tenía tres problemas, de mayor a menor gravedad:
 *
 * 1. De posicionamiento. A un instalador o a un gestor energético no le importa
 *    el framework. Ese espacio de la página, en cualquier empresa consolidada,
 *    lo ocupa prueba social: clientes, colegios profesionales, certificaciones
 *    o —como aquí— la normativa que se cubre.
 * 2. De credibilidad. Enseñar "DeepSeek" y "Framer Motion" en una lista pública
 *    comunica exactamente lo contrario de lo que busca un producto que vende
 *    rigor normativo.
 * 3. De seguridad. Publicar el proveedor de autenticación, la base de datos y
 *    el proveedor de LLM es superficie de ataque regalada.
 *
 * Lo que se muestra ahora es el activo real del producto: qué normativa cubre
 * el motor. Sin animación: es información para leer, no para mirar.
 */

const NORMAS = [
  {
    ref: "RD 244/2019",
    materia: "Autoconsumo eléctrico",
  },
  {
    ref: "RD 1027/2007",
    materia: "RITE — instalaciones térmicas",
  },
  {
    ref: "RD 842/2002",
    materia: "REBT — baja tensión",
  },
  {
    ref: "RD 919/2006",
    materia: "Instalaciones de gas",
  },
  {
    ref: "RD 487/2022",
    materia: "Prevención de legionelosis",
  },
  {
    ref: "Ley 24/2013",
    materia: "Sector eléctrico",
  },
];

export function CoberturaNormativaBanda() {
  return (
    <section
      className="border-b border-border bg-bg"
      aria-labelledby="cobertura-normativa-titulo"
    >
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h2
          id="cobertura-normativa-titulo"
          className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary"
        >
          Normativa de referencia del motor
        </h2>

        <ul className="mt-5 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
          {NORMAS.map(({ ref, materia }) => (
            <li key={ref}>
              <p className="text-sm font-medium tabular-nums text-text-primary">{ref}</p>
              <p className="mt-0.5 text-xs leading-snug text-text-secondary">{materia}</p>
            </li>
          ))}
        </ul>

        <p className="mt-6 max-w-3xl text-xs leading-relaxed text-text-secondary">
          Cada trámite del plan cita la norma en la que se basa. Cuando una
          particularidad autonómica no está verificada, el plan lo indica en vez de
          darla por buena.
        </p>

        {/* Antes esta función solo se mencionaba como una línea más entre ocho
            en la tabla de precios del plan Pro, y en el sidebar del dashboard
            vivía en la 5ª posición de 7 sin ninguna señal de que fuera
            distinta del resto. Es la única vigilancia normativa realmente
            automatizada del producto (pipeline programado que resume cambios
            del BOE y abre PR para revisión humana antes de aplicar ningún
            cambio de regla -- .github/workflows/boe_pipeline.yml), así que
            aquí, junto a la cobertura normativa, es donde tiene sentido que
            un visitante la vea por primera vez (auditoría fase 2,
            2026-08-12, P-15). */}
        <p className="mt-4 max-w-3xl text-xs leading-relaxed text-text-secondary">
          Un pipeline programado vigila el Boletín Oficial del Estado y avisa
          cuando detecta cambios que pueden afectar a tus expedientes activos —
          cada cambio pasa por revisión humana antes de actualizar cualquier
          regla del motor.
        </p>
      </div>
    </section>
  );
}
