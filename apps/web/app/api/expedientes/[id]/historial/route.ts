import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { obtenerExpediente } from "@/lib/expedientes";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Scoping por organización: mismo patrón anti-IDOR que el resto de rutas.
  const expediente = await obtenerExpediente(params.id, orgId);
  if (!expediente) {
    return NextResponse.json({ error: "Expediente no encontrado" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("historial_tramites")
    .select("id, orden, estado_anterior, estado_nuevo, operador_id, creado_en")
    .eq("expediente_id", params.id)
    .order("creado_en", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ historial: data ?? [], usuario_actual: userId });
}
