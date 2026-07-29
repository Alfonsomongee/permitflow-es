import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Notificaciones de plazos para la organización actual (generadas por el cron
 * /api/cron/notificaciones-plazos). Antes la campana del topbar no tenía
 * ningún endpoint detrás: el punto rojo era una imagen fija, no un dato real.
 */
export async function GET() {
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
    return NextResponse.json({ notificaciones: [], noLeidas: 0 });
  }

  const [{ data, error }, { count }] = await Promise.all([
    supabaseAdmin
      .from("notificaciones")
      .select("id, expediente_id, tramite_orden, tipo, dias_restantes, mensaje, leida, creado_en")
      .eq("org_id", org.id)
      .order("leida", { ascending: true })
      .order("dias_restantes", { ascending: true })
      .limit(30),
    supabaseAdmin
      .from("notificaciones")
      .select("id", { count: "exact", head: true })
      .eq("org_id", org.id)
      .eq("leida", false),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notificaciones: data ?? [], noLeidas: count ?? 0 });
}
