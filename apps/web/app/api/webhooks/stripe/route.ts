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
 *
 * Garantías (auditoría 2026-10-01, F-10):
 *  - Cualquier fallo al escribir en Supabase devuelve 500 para que Stripe
 *    reintente (antes se respondía 200 y la organización quedaba en Free
 *    habiendo pagado).
 *  - Idempotente por `event.id` (tabla stripe_eventos).
 *  - Se consulta siempre el estado ACTUAL de la suscripción en Stripe en vez de
 *    fiarse del orden de llegada de los eventos.
 *  - `past_due` conserva el acceso: Stripe aún está reintentando el cobro. Solo
 *    se degrada a Free con `unpaid`, `canceled` o `incomplete_expired`.
 */
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe/client";

type SubscriptionConPeriodo = Stripe.Subscription & { current_period_end?: number };

const ESTADOS_CON_ACCESO = new Set<Stripe.Subscription.Status>(["active", "trialing", "past_due"]);

export async function POST(req: Request) {
  const secreto = process.env.STRIPE_WEBHOOK_SECRET;
  const firma = req.headers.get("stripe-signature");
  if (!secreto) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET no configurado");
    return NextResponse.json({ error: "Webhook no configurado" }, { status: 503 });
  }
  if (!firma) {
    return NextResponse.json({ error: "Falta la firma" }, { status: 400 });
  }

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, firma, secreto);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotencia: registrar el evento; si ya existe, ya se procesó.
  const { error: registroError } = await supabaseAdmin
    .from("stripe_eventos")
    .insert({ id: event.id, tipo: event.type });
  if (registroError) {
    if (registroError.code === "23505") {
      return NextResponse.json({ received: true, duplicado: true });
    }
    console.error("[stripe webhook] no se pudo registrar el evento:", registroError.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  try {
    await procesarEvento(stripe, event);
  } catch (err) {
    console.error(`[stripe webhook] fallo procesando ${event.type} (${event.id}):`, err);
    // Libera el registro para que el reintento de Stripe vuelva a procesarlo.
    await supabaseAdmin.from("stripe_eventos").delete().eq("id", event.id);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function procesarEvento(stripe: Stripe, event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const clerkOrgId = session.metadata?.clerk_org_id;
      const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (!clerkOrgId || !subId) return;
      await sincronizarSuscripcion(await stripe.subscriptions.retrieve(subId), clerkOrgId);
      return;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const evento = event.data.object as Stripe.Subscription;
      const clerkOrgId = evento.metadata?.clerk_org_id;
      if (!clerkOrgId) return;
      // Estado actual en Stripe, no el del evento: los eventos pueden llegar
      // desordenados y un `updated` antiguo no debe pisar uno posterior.
      const actual = await stripe.subscriptions.retrieve(evento.id);
      await sincronizarSuscripcion(actual, clerkOrgId);
      return;
    }

    default:
      return;
  }
}

function finDePeriodo(sub: SubscriptionConPeriodo): string | null {
  // En versiones recientes de la API el fin de periodo vive en el ítem.
  const ts = sub.items?.data?.[0]?.current_period_end ?? sub.current_period_end;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

async function sincronizarSuscripcion(sub: Stripe.Subscription, clerkOrgId: string) {
  const clienteId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

  if (ESTADOS_CON_ACCESO.has(sub.status)) {
    const { error } = await supabaseAdmin
      .from("organizaciones")
      .update({
        stripe_subscription_id: sub.id,
        stripe_price_id: sub.items.data[0]?.price.id ?? null,
        ...(clienteId ? { stripe_customer_id: clienteId } : {}),
        suscripcion_activa: true,
        suscripcion_fin: finDePeriodo(sub as SubscriptionConPeriodo),
        plan: "pro",
      })
      .eq("clerk_org_id", clerkOrgId)
      // Enterprise se contrata fuera de Stripe: no se toca su plan.
      .neq("plan", "enterprise");
    if (error) throw new Error(`activar suscripción: ${error.message}`);
    return;
  }

  const { error: errorActiva } = await supabaseAdmin
    .from("organizaciones")
    .update({ suscripcion_activa: false })
    .eq("clerk_org_id", clerkOrgId);
  if (errorActiva) throw new Error(`desactivar suscripción: ${errorActiva.message}`);

  const { error: errorPlan } = await supabaseAdmin
    .from("organizaciones")
    .update({ plan: "free" })
    .eq("clerk_org_id", clerkOrgId)
    .eq("plan", "pro");
  if (errorPlan) throw new Error(`degradar plan: ${errorPlan.message}`);
}
