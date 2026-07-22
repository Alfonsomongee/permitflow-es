/**
 * apps/web/app/api/webhooks/stripe/route.ts
 *
 * Recibe eventos de Stripe y actualiza el estado de suscripción en Supabase.
 *
 * Configura en Stripe Dashboard > Webhooks:
 *   URL: https://tudominio.com/api/webhooks/stripe
 *   Eventos:
 *     - checkout.session.completed
 *     - customer.subscription.updated
 *     - customer.subscription.deleted
 *     - invoice.payment_failed
 */
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2026-06-24.dahlia",
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;


type StripeSubscriptionWithPeriodEnd = Stripe.Subscription & {
  current_period_end?: number;
};

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.clerk_org_id;
      if (!orgId || !session.subscription) break;

      const sub = await stripe.subscriptions.retrieve(
        session.subscription as string
      );
      await activarSuscripcion(orgId, sub);
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const orgId = sub.metadata?.clerk_org_id;
      if (!orgId) break;

      if (sub.status === "active" || sub.status === "trialing") {
        await activarSuscripcion(orgId, sub);
      } else {
        await desactivarSuscripcion(orgId);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const orgId = sub.metadata?.clerk_org_id;
      if (orgId) await desactivarSuscripcion(orgId);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      // Invoice.metadata no hereda clerk_org_id de la suscripción: hay que
      // resolverlo consultando la suscripción asociada a la factura.
      const subscriptionProp = (invoice as unknown as { subscription?: string | { id?: string } })
        .subscription;
      const subscriptionId =
        typeof subscriptionProp === "string" ? subscriptionProp : subscriptionProp?.id;
      if (!subscriptionId) break;

      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const orgId = sub.metadata?.clerk_org_id;
      if (orgId) await desactivarSuscripcion(orgId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

async function activarSuscripcion(clerkOrgId: string, sub: Stripe.Subscription) {
  const priceId = sub.items.data[0]?.price.id;
  const currentPeriodEnd = (sub as StripeSubscriptionWithPeriodEnd).current_period_end;
  const fin = currentPeriodEnd
    ? new Date(currentPeriodEnd * 1000).toISOString()
    : null;

  await supabaseAdmin
    .from("organizaciones")
    .update({
      stripe_subscription_id: sub.id,
      stripe_price_id: priceId ?? null,
      suscripcion_activa: true,
      suscripcion_fin: fin,
      plan: "pro",
    })
    .eq("clerk_org_id", clerkOrgId);
}

async function desactivarSuscripcion(clerkOrgId: string) {
  await supabaseAdmin
    .from("organizaciones")
    .update({
      suscripcion_activa: false,
      plan: "free",
    })
    .eq("clerk_org_id", clerkOrgId);
}
