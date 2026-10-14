/**
 * apps/web/app/api/stripe/checkout/route.ts
 *
 * Crea una Stripe Checkout Session para el plan Pro.
 * Solo administradores de la organización; una única suscripción por organización.
 */
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe/client";
import { esRespuesta, requerirAdminOrg } from "@/lib/server/roles";

const PRICE_IDS: Record<string, string | undefined> = {
  pro: process.env.STRIPE_PRICE_PRO,
};

export async function POST(req: Request) {
  const sesion = await requerirAdminOrg();
  if (esRespuesta(sesion)) return sesion;
  const { userId, orgId } = sesion;

  const cuerpo = (await req.json().catch(() => ({}))) as { plan?: unknown };
  const plan = typeof cuerpo.plan === "string" ? cuerpo.plan : "pro";
  const priceId = PRICE_IDS[plan];
  if (!(plan in PRICE_IDS)) {
    return NextResponse.json({ error: "Plan no válido" }, { status: 400 });
  }
  if (!priceId) {
    console.error("[stripe checkout] STRIPE_PRICE_PRO no está configurada");
    return NextResponse.json(
      { error: "El pago no está disponible en este momento. Contacta con soporte." },
      { status: 503 }
    );
  }

  const stripe = getStripe();

  const { data: org } = await supabaseAdmin
    .from("organizaciones")
    .select("stripe_customer_id, nombre, suscripcion_activa")
    .eq("clerk_org_id", orgId)
    .single();

  if (org?.suscripcion_activa) {
    return NextResponse.json(
      { error: "Tu organización ya tiene una suscripción activa. Gestiónala desde Ajustes." },
      { status: 409 }
    );
  }

  let customerId = org?.stripe_customer_id;

  if (!customerId) {
    const user = await currentUser();
    // idempotencyKey: dos clics (o dos pestañas) no crean dos clientes de Stripe.
    const customer = await stripe.customers.create(
      {
        email: user?.primaryEmailAddress?.emailAddress,
        name: org?.nombre ?? undefined,
        metadata: { clerk_org_id: orgId, clerk_user_id: userId },
      },
      { idempotencyKey: `customer-${orgId}` }
    );
    customerId = customer.id;

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
    success_url: `${baseUrl}/ajustes?upgraded=1`,
    cancel_url: `${baseUrl}/ajustes`,
    metadata: { clerk_org_id: orgId },
    subscription_data: {
      metadata: { clerk_org_id: orgId },
    },
    allow_promotion_codes: true,
    billing_address_collection: "required",
    tax_id_collection: { enabled: true }, // CIF/NIF para facturación B2B
  });

  return NextResponse.json({ url: session.url });
}
