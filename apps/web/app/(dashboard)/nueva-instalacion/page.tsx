/**
 * apps/web/app/(dashboard)/nueva-instalacion/page.tsx
 *
 * Página de nueva instalación. Delega completamente en NuevaInstalacionForm,
 * que gestiona el estado multi-paso y la navegación al plan de tramitación.
 *
 * Este archivo es deliberadamente minimalista: toda la lógica vive en
 * components/nueva-instalacion/ para facilitar el testing y la reutilización.
 */
import { Suspense } from "react";
import { NuevaInstalacionForm } from "@/components/nueva-instalacion";

export default function NuevaInstalacionPage() {
  // Suspense: NuevaInstalacionForm lee useSearchParams() para poder
  // prellenar la potencia recomendada cuando se llega desde el simulador
  // (?potencia=...) -- mejora 2026-08-07.
  return (
    <Suspense fallback={null}>
      <NuevaInstalacionForm />
    </Suspense>
  );
}
