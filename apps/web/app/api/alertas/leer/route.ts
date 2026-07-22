/**
 * apps/web/app/api/alertas/leer/route.ts
 */
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await req.json();

  const { data: org } = await supabaseAdmin
    .from("organizaciones")
    .select("id")
    .eq("clerk_org_id", orgId)
    .maybeSingle();

  if (!org?.id) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 403 });
  }

  // Solo se permite marcar como leída una alerta que pertenece a la propia
  // organización, evitando que un usuario modifique alertas de otro tenant.
  const { error } = await supabaseAdmin
    .from("alertas_boe")
    .update({ leida: true })
    .eq("id", id)
    .eq("org_id", org.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
