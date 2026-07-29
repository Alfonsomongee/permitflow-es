import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { calcularNotificacionesPlazos } from "@/lib/notificaciones";
import type { PlanTramitacion, TramitesEstadoMap } from "@/types/plan";

export const maxDuration = 60;

/**
 * Cron: recalcula qué trámites en curso están próximos a vencer o ya
 * vencidos, y actualiza la tabla `notificaciones` (consumida por la campana
 * del topbar, antes puramente decorativa).
 *
 * Solo evalúa expedientes activos (no aprobados/rechazados/borrador): un
 * expediente cerrado no puede generar una notificación de plazo con sentido.
 * Además limpia las notificaciones de expedientes que ya se cerraron, para
 * que la campana no arrastre avisos de trámites que ya no importan.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return handle();
}

// Los Cron Jobs de Vercel invocan por GET. Ver nota equivalente en
// app/api/cron/estadisticas-plazos/route.ts.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return handle();
}

async function handle() {
  const PAGE = 500;
  let desde = 0;
  let evaluados = 0;
  let escritos = 0;

  for (;;) {
    const { data, error } = await supabaseAdmin
      .from("expedientes")
      .select("id, org_id, comunidad, estado, plan_tramitacion, tramites_estado")
      .in("estado", ["pendiente", "en_revision"])
      .not("plan_tramitacion", "is", null)
      .range(desde, desde + PAGE - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) break;

    const expedientes = data.map((e) => ({
      id: e.id as string,
      org_id: e.org_id as string,
      comunidad: e.comunidad as string,
      plan_tramitacion: e.plan_tramitacion as PlanTramitacion | null,
      tramites_estado: e.tramites_estado as TramitesEstadoMap | null,
    }));
    evaluados += expedientes.length;

    const notificaciones = calcularNotificacionesPlazos(expedientes);

    for (const n of notificaciones) {
      const { error: upsertError } = await supabaseAdmin.from("notificaciones").upsert(
        {
          org_id: n.orgId,
          expediente_id: n.expedienteId,
          tramite_orden: n.tramiteOrden,
          tipo: n.tipo,
          dias_restantes: n.diasRestantes,
          mensaje: n.mensaje,
          actualizado_en: new Date().toISOString(),
        },
        { onConflict: "expediente_id,tramite_orden,tipo" }
      );
      if (!upsertError) escritos++;
    }

    desde += PAGE;
    if (data.length < PAGE) break;
  }

  // Limpieza: borra notificaciones de trámites que ya no están en_curso (se
  // completaron, se marcaron pendientes de nuevo, o el expediente se cerró).
  // Sin esto, un plazo resuelto seguiría apareciendo como pendiente para
  // siempre en la campana.
  const { data: activas } = await supabaseAdmin
    .from("notificaciones")
    .select("id, expediente_id, tramite_orden");

  let eliminadas = 0;
  if (activas && activas.length > 0) {
    const idsExpedientes = Array.from(new Set(activas.map((a) => a.expediente_id)));
    const { data: expedientesActuales } = await supabaseAdmin
      .from("expedientes")
      .select("id, estado, tramites_estado")
      .in("id", idsExpedientes);

    const vigentes = new Map(
      (expedientesActuales ?? []).map((e) => [e.id as string, e])
    );

    const idsAEliminar: string[] = [];
    for (const notif of activas) {
      const exp = vigentes.get(notif.expediente_id);
      const estados = (exp?.tramites_estado ?? {}) as TramitesEstadoMap;
      const enCurso = estados[String(notif.tramite_orden)]?.estado === "en_curso";
      const expedienteActivo = exp?.estado === "pendiente" || exp?.estado === "en_revision";
      if (!exp || !expedienteActivo || !enCurso) {
        idsAEliminar.push(notif.id);
      }
    }

    if (idsAEliminar.length > 0) {
      const { error: delError } = await supabaseAdmin
        .from("notificaciones")
        .delete()
        .in("id", idsAEliminar);
      if (!delError) eliminadas = idsAEliminar.length;
    }
  }

  return NextResponse.json({ ok: true, expedientesEvaluados: evaluados, escritos, eliminadas });
}
