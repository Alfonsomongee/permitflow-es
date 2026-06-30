/**
 * apps/web/app/api/webhooks/clerk/route.ts
 *
 * Recibe eventos de Clerk (organization.created, organization.updated,
 * user.created…) y los sincroniza con Supabase.
 *
 * Configura en Clerk Dashboard > Webhooks:
 *   URL: https://tudominio.com/api/webhooks/clerk
 *   Eventos: organization.created, organization.updated, organization.deleted
 */
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { supabaseAdmin } from "@/lib/supabase";

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET!;

interface ClerkOrgEvent {
  type: string;
  data: {
    id: string;
    name: string;
    slug: string;
  };
}

export async function POST(req: Request) {
  const headersList = headers();
  const svix_id = headersList.get("svix-id");
  const svix_timestamp = headersList.get("svix-timestamp");
  const svix_signature = headersList.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const payload = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);

  let event: ClerkOrgEvent;
  try {
    event = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as ClerkOrgEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "organization.created":
    case "organization.updated": {
      await supabaseAdmin
        .from("organizaciones")
        .upsert(
          {
            clerk_org_id: event.data.id,
            nombre: event.data.name,
          },
          { onConflict: "clerk_org_id" }
        );
      break;
    }
    case "organization.deleted": {
      // El cascade en el schema borra expedientes automáticamente
      await supabaseAdmin
        .from("organizaciones")
        .delete()
        .eq("clerk_org_id", event.data.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
