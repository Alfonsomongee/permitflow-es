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

  // Estado de lectura por organización (tabla alertas_leidas): funciona tanto
  // para alertas globales (org_id null, compartidas por todos los tenants)
  // como para las propias. El UPDATE anterior sobre alertas_boe filtrado por
  // org_id hacía imposible marcar como leída una alerta global.
  const { data: alerta } = await supabaseAdmin
    .from("alertas_boe")
    .select("id, org_id")
    .eq("id", id)
    .maybeSingle();

  if (!alerta || (alerta.org_id !== null && alerta.org_id !== org.id)) {
    return NextResponse.json({ error: "Alerta no encontrada" }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("alertas_leidas")
    .upsert({ alerta_id: id, org_id: org.id }, { onConflict: "alerta_id,org_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
