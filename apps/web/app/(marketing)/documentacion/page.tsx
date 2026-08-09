/**
 * apps/web/app/(marketing)/documentacion/page.tsx
 *
 * Guía de uso pública de la aplicación. Ruta: /documentacion
 *
 * Antes, el enlace "Documentación" del footer apuntaba a href: null
 * ("Próximamente" -- ver D-11, auditoría 2026-08-06). El contenido describe
 * el flujo real de la app tal y como existe hoy (wizard de nueva instalación,
 * plan de tramitación y sus paneles, exportación, alertas). No documenta
 * nada que no esté ya construido.
 */
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Documentación — PermitFlow ES",
  description: "Guía de uso: cómo clasificar una instalación, seguir su plan de tramitación y gestionar la documentación del expediente.",
};

const SECCIONES = [
  {
    titulo: "1. Clasificar una instalación",
    cuerpo:
      "Desde \"Nueva instalación\" indicas el tipo de instalación (fotovoltaica, IRVE, climatización, ACS o gas), la comunidad autónoma y el uso (residencial, terciario o industrial). El asistente pide después los parámetros técnicos (potencia, superficie, número de puntos de recarga, etc.) según el tipo elegido, y si vas a solicitar ayudas públicas (MOVES III, Next Generation EU). Con eso, el motor normativo genera el plan de tramitación.",
  },
  {
    titulo: "2. El plan de tramitación",
    cuerpo:
      "Cada expediente muestra la lista de trámites que le corresponden, en orden: organismo ante el que se presenta, plazo estimado, documentación requerida y estado (pendiente, en curso, completado). El tiempo total estimado se calcula sumando los plazos de cada trámite, ajustado a días hábiles.",
  },
  {
    titulo: "3. Documentos del expediente",
    cuerpo:
      "El panel de Documentos genera y permite descargar la documentación de cada trámite (memorias, formularios, checklist) a partir de los datos introducidos en el wizard.",
  },
  {
    titulo: "4. Portal del cliente",
    cuerpo:
      "Si necesitas que el titular de la instalación te aporte documentación (DNI, factura, escritura...), el Portal cliente genera un enlace externo donde puede subir esos archivos sin necesidad de crear una cuenta. Tú ves lo que sube desde el propio expediente.",
  },
  {
    titulo: "5. Subsanaciones",
    cuerpo:
      "Cuando un organismo devuelve un trámite con requerimientos (falta un documento, un dato es incorrecto), se registra como un evento estructurado en el panel de Subsanaciones: qué se pidió, cuándo y si ya está resuelto.",
  },
  {
    titulo: "6. Exportar e historial",
    cuerpo:
      "El plan completo se puede exportar a PDF para compartir con el cliente o adjuntar a la solicitud. El panel de Historial registra los cambios de estado del expediente y quién los hizo.",
  },
  {
    titulo: "7. Alertas del BOE",
    cuerpo:
      "Cuando cambia una norma que afecta a un trámite de un expediente en curso, aparece como alerta filtrable por comunidad autónoma, vertical técnica y urgencia, con opción de marcarlas como leídas.",
  },
  {
    titulo: "Atajos",
    cuerpo:
      "Pulsa Cmd/Ctrl+K en cualquier pantalla del panel para abrir la paleta de comandos (buscar expedientes, navegar). Pulsa \"/\" dentro de la tabla de expedientes para saltar directamente al buscador.",
  },
];

export default function DocumentacionPage() {
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
        Documentación
      </h1>
      <p className="mt-3 text-text-secondary leading-relaxed">
        Cómo funciona PermitFlow ES, de principio a fin: desde clasificar una
        instalación hasta cerrar el expediente.
      </p>

      <div className="mt-12 flex flex-col gap-8">
        {SECCIONES.map((s) => (
          <section key={s.titulo}>
            <h2 className="text-base font-medium text-text-primary">{s.titulo}</h2>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">{s.cuerpo}</p>
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-lg border border-border bg-surface p-5">
        <p className="text-sm text-text-secondary leading-relaxed">
          ¿Algo no cuadra o falta algo aquí? {" "}
          <Link href="/contacto" className="font-medium text-primary hover:underline">
            Escríbenos
          </Link>
          {" "}y lo revisamos.
        </p>
      </div>
    </div>
  );
}
