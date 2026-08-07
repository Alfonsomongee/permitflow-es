/**
 * apps/web/app/(marketing)/contacto/page.tsx
 *
 * Página pública de contacto. Ruta: /contacto
 *
 * Antes de esta página, el wizard del simulador (simulator-wizard.tsx)
 * redirigía aquí para leads no residenciales (empresa, comunidad de
 * vecinos) y la ruta no existía (404) -- ver hallazgo D-11 de la
 * auditoría 2026-08-06. El formulario postea a /api/contacto, que reenvía
 * a apps/api/routers/contacto.py (rate limit + envío por Resend).
 */
import { Suspense } from "react";
import { ContactoForm } from "@/components/marketing/ContactoForm";

export const metadata = {
  title: "Contacto — PermitFlow ES",
  description:
    "Cuéntanos qué necesitas y te responderemos en el plazo más breve posible.",
};

export default function ContactoPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center px-6 py-20">
      <h1 className="text-3xl font-medium tracking-tight text-text-primary">
        Hablemos
      </h1>
      <p className="mt-3 text-text-secondary">
        Cuéntanos brevemente qué necesitas -- instalación, comunidad de
        vecinos, integración a medida -- y te contestamos por email.
      </p>

      <div className="mt-10">
        <Suspense fallback={null}>
          <ContactoForm />
        </Suspense>
      </div>
    </div>
  );
}
