import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { obtenerExpediente } from "@/lib/expedientes";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * apps/web/app/api/expedientes/[id]/subsanaciones/[subsanacionId]/route.ts
 *
 * Marcar un requerimiento de subsanación como resuelto. Solo ese cambio de
 * estado -- no se permite editar descripción/plazo una vez creado, para que
 * el registro sea un histórico fiable de lo que realmente se pidió.
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; subsanacionId: string } }
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

  const body = (await req.json().catch(() => ({}))) as { resuelta?: boolean };
  if (body.resuelta !== true) {
    return NextResponse.json({ error: "Solo se admite marcar como resuelta" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("subsanaciones")
    .update({ resuelta: true, resuelta_en: new Date().toISOString() })
    .eq("id", params.subsanacionId)
    .eq("expediente_id", params.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Subsanación no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
