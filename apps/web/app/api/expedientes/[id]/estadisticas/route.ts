import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { obtenerExpediente } from "@/lib/expedientes";
import { obtenerEstadisticasPlazo } from "@/lib/estadisticas";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const expediente = await obtenerExpediente(params.id, orgId);
  if (!expediente) {
    return NextResponse.json({ error: "Expediente no encontrado" }, { status: 404 });
  }
  if (!expediente.plan_tramitacion) {
    return NextResponse.json({});
  }

  const { data: org } = await supabaseAdmin
    .from("organizaciones")
    .select("plan, suscripcion_activa")
    .eq("clerk_org_id", orgId)
    .maybeSingle();

  const habilitado = org?.suscripcion_activa || org?.plan === "enterprise";
  if (!habilitado) {
    // Sin datos en vez de 402: el upsell ya vive en Documentos/Validador;
    // repetirlo por cada trámite del plan sería ruido, no conversión.
    return NextResponse.json({});
  }

  const estadisticas = await obtenerEstadisticasPlazo(
    expediente.comunidad,
    expediente.tipo_instalacion,
    expediente.plan_tramitacion.tramites
  );

  return NextResponse.json(estadisticas);
}
