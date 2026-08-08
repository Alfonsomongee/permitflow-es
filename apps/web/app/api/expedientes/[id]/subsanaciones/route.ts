import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { obtenerExpediente } from "@/lib/expedientes";
import { supabaseAdmin } from "@/lib/supabase";
import { resolverNombresClerk } from "@/lib/clerk-nombres";
import { calcularVencimientoHabil } from "@/lib/festivos";
import { hoyIso } from "@/lib/plazos";
import type { PlanTramitacion } from "@/types/plan";

/**
 * apps/web/app/api/expedientes/[id]/subsanaciones/route.ts
 *
 * Requerimientos de subsanación (2026-08-08): antes de esto, un requisito
 * de corrección de la administración solo se podía anotar en el campo de
 * texto libre `notas` del expediente, sin plazo ni asociación a un trámite
 * concreto -- "la causa nº1 de retraso" según el brainstorming de producto,
 * y hasta ahora fuera de la herramienta.
 *
 * GET  -> lista las subsanaciones del expediente (más recientes primero).
 * POST -> registra una nueva, con plazo propio calculado en días hábiles
 *         (mismo motor que el plazo legal del trámite, lib/festivos.ts,
 *         pero como plazo independiente: no toca tramites_estado).
 */

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

  const { data, error } = await supabaseAdmin
    .from("subsanaciones")
    .select(
      "id, tramite_orden, tramite_nombre, descripcion, plazo_dias, fecha_inicio, fecha_limite, resuelta, resuelta_en, creado_por, creado_en"
    )
    .eq("expediente_id", params.id)
    .order("resuelta", { ascending: true })
    .order("fecha_limite", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const subsanaciones = data ?? [];
  const nombresPorId = await resolverNombresClerk(subsanaciones.map((s) => s.creado_por));
  const conNombre = subsanaciones.map((s) => ({
    ...s,
    creado_por_nombre: nombresPorId[s.creado_por] ?? null,
  }));

  return NextResponse.json({ subsanaciones: conNombre });
}

export async function POST(
  req: Request,
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

  const body = (await req.json().catch(() => ({}))) as {
    tramite_orden?: number;
    descripcion?: string;
    plazo_dias?: number;
  };

  const tramiteOrden = body.tramite_orden;
  const descripcion = body.descripcion?.trim();
  const plazoDias = body.plazo_dias;

  if (
    typeof tramiteOrden !== "number" ||
    !descripcion ||
    descripcion.length < 5 ||
    typeof plazoDias !== "number" ||
    plazoDias < 1 ||
    plazoDias > 90
  ) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const plan = expediente.plan_tramitacion as PlanTramitacion | null;
  const tramite = plan?.tramites?.find((t) => t.orden === tramiteOrden);
  if (!tramite) {
    return NextResponse.json({ error: "Trámite no encontrado en el plan" }, { status: 400 });
  }

  const { data: org } = await supabaseAdmin
    .from("organizaciones")
    .select("id")
    .eq("clerk_org_id", orgId)
    .maybeSingle();
  if (!org) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 403 });
  }

  const fechaInicio = hoyIso();
  const { fechaVencimiento } = calcularVencimientoHabil(fechaInicio, plazoDias, expediente.comunidad);

  const { data: fila, error } = await supabaseAdmin
    .from("subsanaciones")
    .insert({
      expediente_id: params.id,
      org_id: org.id,
      tramite_orden: tramiteOrden,
      tramite_nombre: tramite.nombre,
      descripcion,
      plazo_dias: plazoDias,
      fecha_inicio: fechaInicio,
      fecha_limite: fechaVencimiento,
      creado_por: userId,
    })
    .select(
      "id, tramite_orden, tramite_nombre, descripcion, plazo_dias, fecha_inicio, fecha_limite, resuelta, resuelta_en, creado_por, creado_en"
    )
    .single();

  if (error || !fila) {
    return NextResponse.json({ error: error?.message ?? "No se pudo registrar" }, { status: 500 });
  }

  return NextResponse.json({ subsanacion: { ...fila, creado_por_nombre: null } }, { status: 201 });
}
