/**
 * apps/web/app/api/stripe/checkout/route.ts
 *
 * Crea una Stripe Checkout Session para el plan Pro.
 * El usuario debe estar autenticado (Clerk) para acceder.
 */
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

const PRICE_IDS: Record<string, string> = {
  pro: process.env.STRIPE_PRICE_PRO!,
};

export async function POST(req: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { plan = "pro" } = await req.json();
  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    return NextResponse.json({ error: "Plan no válido" }, { status: 400 });
  }

  // Buscar o crear el customer de Stripe para esta organización
  const { data: org } = await supabaseAdmin
    .from("organizaciones")
    .select("stripe_customer_id, nombre")
    .eq("clerk_org_id", orgId)
    .single();

  let customerId = org?.stripe_customer_id;

  if (!customerId) {
    const user = await currentUser();
    const customer = await stripe.customers.create({
      email: user?.primaryEmailAddress?.emailAddress,
      name: org?.nombre ?? undefined,
      metadata: { clerk_org_id: orgId, clerk_user_id: userId },
    });
    customerId = customer.id;

    // Guardar en Supabase para futuras sesiones
    await supabaseAdmin
      .from("organizaciones")
      .update({ stripe_customer_id: customerId })
      .eq("clerk_org_id", orgId);
  }

  const baseUrl = process.env.NEXT_PUBLIC_URL ?? "http://localhost:3007";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/expedientes?upgraded=1`,
    cancel_url: `${baseUrl}/#precios`,
    metadata: { clerk_org_id: orgId },
    subscription_data: {
      metadata: { clerk_org_id: orgId },
    },
    allow_promotion_codes: true,
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },   // CIF/NIF para facturación B2B
  });

  return NextResponse.json({ url: session.url });
}
