import Link from "next/link";
import { ArrowRight, FileText, Clock } from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";
import { mesYAnio, resumenCobertura } from "@/lib/cobertura-resumen";

/**
 * Cifras de cobertura del motor normativo.
 *
 * Se muestran estáticas a propósito. Antes subían animadas con `CountUp`, lo
 * que invita a mirar la animación en vez de leer el dato — y en un producto de
 * cumplimiento el dato es el argumento.
 *
 * La tercera métrica era «< 2 s para generar el plan». Se ha sustituido por la
 * fecha de última revisión normativa: el tiempo de respuesta es una métrica de
 * vanidad técnica que además compromete una promesa, mientras que a quien
 * compra esto le importa cuándo se revisó por última vez la normativa que va a
 * usar para presentar un expediente (auditoría UX/UI 2026-08-11, D-10).
 */
const RESUMEN = resumenCobertura();

// Cifras DERIVADAS de los JSON del motor (lib/cobertura-resumen.ts), no escritas a
// mano: la fecha de "última revisión" era un literal ("Ago. 2026") que no tenía
// por qué coincidir con el contenido real.
const COBERTURA = [
  { valor: String(RESUMEN.comunidades), label: "comunidades autónomas con motor activo" },
  { valor: String(RESUMEN.verticales), label: "tecnologías: fotovoltaica, IRVE, aerotermia, ACS y gas" },
  { valor: mesYAnio(RESUMEN.ultimaRevision), label: "última revisión del contenido normativo" },
];

// Ejemplo ILUSTRATIVO: es la salida real del motor para una fotovoltaica
// residencial de 8 kW en Andalucía (tests/casos_referencia/andalucia_fotovoltaica_8kw.json).
// Antes la tarjeta mostraba trámites que el motor no devuelve ("Licencia de obras
// exenta", PUES en 15 días) y un estado "Aprobado" inventado.
const EJEMPLO_TRAMITES = [
  { nombre: "Solicitud del CAU a la distribuidora", dias: 15 },
  { nombre: "Memoria Técnica de Diseño (MTD)", dias: 2 },
  { nombre: "Certificado de Instalación Eléctrica (CIE)", dias: 1 },
];

export function HeroSection() {
  return (
    <section className="border-b border-border bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-12 md:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">

          {/* Columna Izquierda: Texto */}
          <div className="flex flex-col items-start">
            <FadeIn>
              <div className="mb-6 inline-flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-1.5">
                <span className="text-xs font-medium text-text-secondary">
                  Motor normativo · 17 CC. AA. · 5 tecnologías
                </span>
              </div>

              <h1 className="mb-5 text-4xl sm:text-5xl lg:text-6xl font-medium leading-[1.1] tracking-tight text-text-primary">
                El trámite correcto,{" "}
                <span className="text-primary">a la primera</span>
              </h1>

              <p className="mb-8 max-w-xl text-lg text-text-secondary leading-relaxed">
                PermitFlow clasifica la instalación y genera el plan de tramitación
                exacto para tu comunidad autónoma, con la base legal de cada trámite
                citada y los huecos de verificación a la vista.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/nueva-instalacion"
                  className="flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
                >
                  Clasificar instalación
                  <ArrowRight size={15} aria-hidden />
                </Link>
                <Link
                  href="#como-funciona"
                  className="rounded-lg border border-border px-5 py-3 text-sm text-text-secondary transition-colors hover:bg-bg hover:text-text-primary"
                >
                  Ver cómo funciona
                </Link>
              </div>
            </FadeIn>
          </div>

          {/* Columna Derecha: ejemplo ilustrativo de plan de tramitación */}
          <div className="hidden lg:block">
            <FadeIn className="mx-auto w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-card">
              <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h3 className="font-medium text-text-primary">Autoconsumo residencial</h3>
                  <p className="text-xs text-text-secondary">Andalucía · 8 kW · baja tensión</p>
                </div>
                <div className="rounded-md bg-warning/10 px-2 py-1 text-xs font-medium text-warning-dark">
                  Ejemplo ilustrativo
                </div>
              </div>

              <ol className="space-y-3">
                {EJEMPLO_TRAMITES.map((tramite, i) => (
                  <li key={tramite.nombre} className="flex gap-3 rounded-lg border border-border bg-surface p-3 shadow-sm">
                    <div className="mt-0.5 text-primary"><FileText size={16} aria-hidden /></div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {i + 1}. {tramite.nombre}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-text-secondary">
                        <Clock size={12} aria-hidden /> {tramite.dias} {tramite.dias === 1 ? "día" : "días"} estimados
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-text-secondary">
                + 2 trámites más (registro y comunicación a la distribuidora). El plan real indica la base legal de
                cada paso y el nivel de verificación de la normativa de tu comunidad.
              </p>
            </FadeIn>
          </div>

        </div>
      </div>

      {/* Banda de cobertura */}
      <div className="border-t border-border">
        <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {COBERTURA.map(({ valor, label }) => (
            <div key={label} className="px-8 py-6">
              <p className="text-3xl font-medium tracking-tight tabular-nums text-text-primary">
                {valor}
              </p>
              <p className="mt-1 text-sm text-text-secondary">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
