/**
 * apps/web/app/(dashboard)/ajustes/page.tsx
 *
 * El enlace "Ajustes" existía en el sidebar (persistente en toda la app) y
 * en el Command Palette, pero la ruta nunca se construyó -- 404 directo.
 * Esta página cubre lo que hoy es gestionable de verdad, sin inventar
 * funcionalidad: datos reales de la organización (Supabase), gestión de
 * equipo y cuenta personal vía los componentes nativos de Clerk (ya es una
 * dependencia del proyecto, cero funcionalidad nueva que mantener), y un
 * acceso al Customer Portal de Stripe para la suscripción.
 */
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { AjustesTabs, type OrgInfo } from "@/components/ajustes/AjustesTabs";

export const metadata = {
  title: "Ajustes — PermitFlow ES",
};

export default async function AjustesPage() {
  const { orgId } = await auth();
  if (!orgId) {
    redirect("/sign-in");
  }

  const { data: org } = await supabaseAdmin
    .from("organizaciones")
    .select("nombre, plan, suscripcion_activa, suscripcion_fin, stripe_customer_id")
    .eq("clerk_org_id", orgId)
    .single();

  const orgInfo: OrgInfo = {
    nombre: org?.nombre ?? "Tu organización",
    plan: org?.plan ?? "free",
    suscripcionActiva: org?.suscripcion_activa ?? false,
    suscripcionFin: org?.suscripcion_fin ?? null,
    tieneClienteStripe: Boolean(org?.stripe_customer_id),
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Ajustes</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Organización, equipo y cuenta.
        </p>
      </div>

      <AjustesTabs orgInfo={orgInfo} />
    </div>
  );
}
