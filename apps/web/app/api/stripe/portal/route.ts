/**
 * apps/web/app/api/stripe/portal/route.ts
 *
 * Crea una sesión del Customer Portal de Stripe, para que la organización
 * gestione su suscripción (cambiar plan, actualizar tarjeta, cancelar,
 * descargar facturas) sin que tengamos que construir esa UI nosotros.
 * Mismo patrón de auth que /api/stripe/checkout/route.ts.
 *
 * Requiere que la organización ya tenga stripe_customer_id (se crea en el
 * primer checkout). Si no lo tiene, es que nunca ha pagado -- no hay nada
 * que gestionar todavía.
 */
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiVersion: "2026-06-24.dahlia" as any,
});

export async function POST() {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: org } = await supabaseAdmin
    .from("organizaciones")
    .select("stripe_customer_id")
    .eq("clerk_org_id", orgId)
    .single();

  if (!org?.stripe_customer_id) {
    return NextResponse.json(
      { error: "Tu organización todavía no tiene una suscripción de pago que gestionar." },
      { status: 400 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_URL ?? "http://localhost:3007";

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: `${baseUrl}/ajustes`,
  });

  return NextResponse.json({ url: session.url });
}
