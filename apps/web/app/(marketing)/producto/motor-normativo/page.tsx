/**
 * apps/web/app/(marketing)/producto/motor-normativo/page.tsx
 *
 * Página pública que explica qué es el motor normativo. Ruta: /producto/motor-normativo
 *
 * Antes, el enlace "Motor Normativo" del footer apuntaba a href: null
 * ("Próximamente" -- ver D-11, auditoría 2026-08-06). El contenido de esta
 * página describe la funcionalidad real ya construida (apps/api/motor_normativo/
 * reglas/{comunidad}/{vertical}.json, content/cobertura_normativa.ts): no se
 * inventa nada, solo se documenta lo que el motor ya hace hoy, incluyendo sus
 * huecos de cobertura reales.
 */
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertTriangle, FileSearch } from "lucide-react";

export const metadata = {
  title: "Motor Normativo — PermitFlow ES",
  description:
    "Cómo clasifica PermitFlow ES los trámites administrativos de instalaciones técnicas: reglas por comunidad autónoma, niveles de verificación y fuentes oficiales.",
};

const VERTICALES = [
  { nombre: "Fotovoltaica autoconsumo", detalle: "Régimen de autorizaciones vs. PUES, umbral de 100 kW." },
  { nombre: "Recarga de vehículo eléctrico (IRVE)", detalle: "Diferenciación PUES / TECI, registro MITECO, MOVES III." },
  { nombre: "Climatización y aerotermia", detalle: "RITE, RSIF y F-Gas, inspecciones periódicas OCA." },
  { nombre: "Agua caliente sanitaria (ACS)", detalle: "RITE, prevención de legionella, mantenimiento y registros." },
  { nombre: "Gas baja presión", detalle: "Norma UNE, certificados IRG, presión normal y 5+ bar." },
];

const NIVELES = [
  {
    icon: CheckCircle2,
    nombre: "Verificada",
    color: "text-success",
    detalle:
      "La normativa citada se ha contrastado directamente contra el boletín oficial correspondiente (BOE, BOJA, DOGC, etc.), no contra portales de terceros.",
  },
  {
    icon: AlertTriangle,
    nombre: "Verificada con observaciones",
    color: "text-warning",
    detalle:
      "La mayoría de trámites son fiables, pero persisten huecos documentados (una plataforma sin confirmar, una tasa sin cifra oficial) que se muestran explícitamente en el plan generado.",
  },
  {
    icon: FileSearch,
    nombre: "En ampliación",
    color: "text-text-secondary",
    detalle:
      "Normativa genérica o en revisión, todavía sin verificación específica para esa combinación de comunidad y vertical. Se avisa en el propio formulario antes de generar el plan.",
  },
];

export default function MotorNormativoPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-primary"
      >
        <ArrowLeft size={14} />
        Volver al inicio
      </Link>

      <h1 className="mt-6 text-3xl font-medium tracking-tight text-text-primary">
        El motor normativo
      </h1>
      <p className="mt-3 text-text-secondary leading-relaxed">
        Clasifica una instalación técnica (tipo, comunidad autónoma, uso) y
        genera el plan de trámites real que le corresponde: qué autorización
        pedir, ante qué organismo, con qué documentación y en qué plazos.
        No es un buscador de leyes: es un conjunto de reglas estructuradas,
        una por cada combinación de comunidad autónoma y vertical técnica,
        que se contrastan contra normativa oficial vigente.
      </p>

      <section className="mt-12">
        <h2 className="text-lg font-medium text-text-primary">
          Cinco verticales técnicas
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {VERTICALES.map((v) => (
            <div key={v.nombre} className="rounded-lg border border-border bg-surface p-4">
              <p className="text-sm font-medium text-text-primary">{v.nombre}</p>
              <p className="mt-1 text-xs text-text-secondary leading-relaxed">{v.detalle}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-medium text-text-primary">
          Niveles de verificación
        </h2>
        <p className="mt-2 text-sm text-text-secondary leading-relaxed">
          Las 17 comunidades autónomas tienen reglas cargadas para las cinco
          verticales, pero no todas están verificadas con el mismo nivel de
          detalle. En vez de presentar todo como si estuviera igual de
          confirmado, cada combinación muestra su nivel real:
        </p>
        <div className="mt-4 flex flex-col gap-3">
          {NIVELES.map(({ icon: Icon, nombre, color, detalle }) => (
            <div key={nombre} className="flex gap-3 rounded-lg border border-border bg-surface p-4">
              <Icon size={18} className={`mt-0.5 shrink-0 ${color}`} aria-hidden />
              <div>
                <p className="text-sm font-medium text-text-primary">{nombre}</p>
                <p className="mt-1 text-xs text-text-secondary leading-relaxed">{detalle}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-medium text-text-primary">
          Fuentes y actualización
        </h2>
        <p className="mt-2 text-sm text-text-secondary leading-relaxed">
          Cada regla cita su fuente legal (ley, decreto u orden, con su
          referencia oficial en el boletín correspondiente). Un pipeline
          automatizado vigila el BOE y los boletines autonómicos para
          detectar normativa nueva o derogada que pueda afectar a reglas ya
          publicadas. Hoy, Andalucía es la única comunidad con las cinco
          verticales verificadas sin huecos pendientes; el resto amplía su
          cobertura de forma continua.
        </p>
        <Link
          href="/#cobertura"
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          Ver el estado de cobertura por comunidad autónoma →
        </Link>
      </section>
    </div>
  );
}
