import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/** Marca una notificación (o todas las de la organización) como leída. */
export async function POST(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: org } = await supabaseAdmin
    .from("organizaciones")
    .select("id")
    .eq("clerk_org_id", orgId)
    .maybeSingle();

  if (!org?.id) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as { id?: string; todas?: boolean };

  let query = supabaseAdmin.from("notificaciones").update({ leida: true }).eq("org_id", org.id);

  if (body.todas) {
    // No añade filtro extra: marca todas las de esta organización.
  } else if (body.id) {
    query = query.eq("id", body.id);
  } else {
    return NextResponse.json({ error: "Falta id o todas=true" }, { status: 400 });
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
