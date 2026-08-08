import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { obtenerExpediente } from "@/lib/expedientes";
import { supabaseAdmin } from "@/lib/supabase";
import { resolverNombresClerk } from "@/lib/clerk-nombres";

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

  const historial = data ?? [];

  // Resolver operador_id (Clerk user id crudo) a un nombre legible -- antes
  // el panel de actividad mostraba "operador …a1b2c3" para cualquiera que no
  // fuera el propio usuario (mejoras 2026-08-07). Una sola llamada batch,
  // no una por entrada.
  const nombresPorId = await resolverNombresClerk(historial.map((h) => h.operador_id));

  const historialConNombre = historial.map((h) => ({
    ...h,
    operador_nombre: nombresPorId[h.operador_id] ?? null,
  }));

  return NextResponse.json({ historial: historialConNombre, usuario_actual: userId });
}
