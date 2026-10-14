/**
 * apps/web/app/api/stripe/portal/route.ts
 *
 * Crea una sesión del Customer Portal de Stripe, para que la organización
 * gestione su suscripción (cambiar plan, actualizar tarjeta, cancelar,
 * descargar facturas). Solo administradores: desde el portal se puede cancelar.
 *
 * Requiere que la organización ya tenga stripe_customer_id (se crea en el
 * primer checkout). Si no lo tiene, es que nunca ha pagado.
 */
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe/client";
import { esRespuesta, requerirAdminOrg } from "@/lib/server/roles";

export async function POST() {
  const sesion = await requerirAdminOrg();
  if (esRespuesta(sesion)) return sesion;

  const { data: org } = await supabaseAdmin
    .from("organizaciones")
    .select("stripe_customer_id")
    .eq("clerk_org_id", sesion.orgId)
    .single();

  if (!org?.stripe_customer_id) {
    return NextResponse.json(
      { error: "Tu organización todavía no tiene una suscripción de pago que gestionar." },
      { status: 400 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_URL ?? "http://localhost:3007";

  const session = await getStripe().billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: `${baseUrl}/ajustes`,
  });

  return NextResponse.json({ url: session.url });
}
