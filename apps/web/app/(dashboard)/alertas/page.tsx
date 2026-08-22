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
import { listarExpedientes } from "@/lib/expedientes";
import { mapearAlertasAExpedientes, alertaRelevanteParaCartera, obtenerAlertasOrg } from "@/lib/alertas";

async function getAlertas(clerkOrgId: string) {
  // PostgREST no admite subqueries dentro de un filtro .or(), así que
  // resolvemos primero el id interno de la organización.
  const { data: org } = await supabaseAdmin
    .from("organizaciones")
    .select("id")
    .eq("clerk_org_id", clerkOrgId)
    .maybeSingle();

  const alertas = await obtenerAlertasOrg(clerkOrgId);

  // Estado de lectura por organización: sobreescribimos `leida` con el valor
  // real de este tenant (tabla alertas_leidas), sin tocar el componente.
  if (org?.id && alertas.length > 0) {
    const { data: leidas } = await supabaseAdmin
      .from("alertas_leidas")
      .select("alerta_id")
      .eq("org_id", org.id)
      .in(
        "alerta_id",
        alertas.map((a) => a.id)
      );
    const leidasSet = new Set((leidas ?? []).map((l) => l.alerta_id));
    return alertas.map((a) => ({ ...a, leida: leidasSet.has(a.id) }));
  }
  return alertas;
}

export default async function AlertasPage() {
  const { orgId } = await auth();
  if (!orgId) redirect("/sign-in");

  const [alertas, expedientes] = await Promise.all([
    getAlertas(orgId),
    listarExpedientes(orgId),
  ]);
  const expedientesPorAlerta = mapearAlertasAExpedientes(alertas, expedientes);
  const relevantesCartera = new Set(
    alertas.filter((a) => alertaRelevanteParaCartera(a, expedientes)).map((a) => a.id)
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-text-primary">Alertas BOE</h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          Cambios normativos detectados automáticamente por el pipeline de IA.
        </p>
      </div>
      <AlertasBoeList
        alertas={alertas}
        expedientesPorAlerta={expedientesPorAlerta}
        relevantesCartera={relevantesCartera}
        hayCartera={expedientes.length > 0}
      />
    </div>
  );
}
