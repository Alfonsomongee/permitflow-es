/**
 * apps/web/app/(dashboard)/nueva-instalacion/page.tsx
 *
 * Página de nueva instalación. Delega completamente en NuevaInstalacionForm,
 * que gestiona el estado multi-paso y la navegación al plan de tramitación.
 *
 * Este archivo es deliberadamente minimalista: toda la lógica vive en
 * components/nueva-instalacion/ para facilitar el testing y la reutilización.
 */
import { NuevaInstalacionForm } from "@/components/nueva-instalacion";

export default function NuevaInstalacionPage() {
  return <NuevaInstalacionForm />;
}
