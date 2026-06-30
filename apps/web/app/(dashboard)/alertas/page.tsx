/**
 * apps/web/app/(dashboard)/alertas/page.tsx
 *
 * Panel de alertas del pipeline BOE.
 * Lee de la tabla alertas_boe en Supabase.
 */
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { AlertasBoeList } from "@/components/dashboard/AlertasBoeList";

async function getAlertas(clerkOrgId: string) {
  // Alertas globales (sin org) + alertas específicas de la organización
  const { data } = await supabaseAdmin
    .from("alertas_boe")
    .select("*")
    .or(`org_id.is.null,org_id.eq.(select id from organizaciones where clerk_org_id='${clerkOrgId}')`)
    .order("creado_en", { ascending: false })
    .limit(50);

  return data ?? [];
}

export default async function AlertasPage() {
  const { orgId } = await auth();
  if (!orgId) redirect("/sign-in");

  const alertas = await getAlertas(orgId);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-text-primary">Alertas BOE</h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          Cambios normativos detectados automáticamente por el pipeline de IA.
        </p>
      </div>
      <AlertasBoeList alertas={alertas} />
    </div>
  );
}
