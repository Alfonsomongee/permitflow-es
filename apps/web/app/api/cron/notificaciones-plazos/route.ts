import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verificarCron } from "@/lib/server/cron-auth";
import { calcularNotificacionesPlazos } from "@/lib/notificaciones";
import type { PlanTramitacion, TramitesEstadoMap } from "@/types/plan";

export const maxDuration = 60;

/** Tamaño de lote para upserts, borrados y filtros `.in()` (evita URLs enormes). */
const LOTE = 100;

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
  const denegado = verificarCron(req);
  if (denegado) return denegado;
  return handle();
}

// Los Cron Jobs de Vercel invocan por GET. Ver nota equivalente en
// app/api/cron/estadisticas-plazos/route.ts.
export async function GET(req: NextRequest) {
  const denegado = verificarCron(req);
  if (denegado) return denegado;
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
      .order("id", { ascending: true })
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

    // Upsert por lotes (antes: una petición por notificación).
    const filas = notificaciones.map((n) => ({
      org_id: n.orgId,
      expediente_id: n.expedienteId,
      tramite_orden: n.tramiteOrden,
      tipo: n.tipo,
      dias_restantes: n.diasRestantes,
      mensaje: n.mensaje,
      actualizado_en: new Date().toISOString(),
    }));
    for (let i = 0; i < filas.length; i += LOTE) {
      const lote = filas.slice(i, i + LOTE);
      const { error: upsertError } = await supabaseAdmin
        .from("notificaciones")
        .upsert(lote, { onConflict: "expediente_id,tramite_orden,tipo" });
      if (upsertError) {
        console.error("[cron notificaciones] upsert fallido:", upsertError.message);
      } else {
        escritos += lote.length;
      }
    }

    desde += PAGE;
    if (data.length < PAGE) break;
  }

  // Limpieza: borra notificaciones de trámites que ya no están en_curso (se
  // completaron, se marcaron pendientes de nuevo, o el expediente se cerró).
  // Sin esto, un plazo resuelto seguiría apareciendo como pendiente para
  // siempre en la campana.
  //
  // Robustez: si CUALQUIER consulta falla se aborta la limpieza sin borrar
  // nada. Antes un error en la consulta de expedientes dejaba el mapa de
  // "vigentes" vacío y se marcaban TODAS las notificaciones para borrar; además
  // la lectura sin paginar se truncaba a 1000 filas y el `.in()` con miles de
  // ids podía superar el límite de longitud de URL.
  let eliminadas = 0;
  let limpiezaOmitida = false;
  for (let pagina = 0; ; pagina++) {
    const { data: activas, error: activasError } = await supabaseAdmin
      .from("notificaciones")
      .select("id, expediente_id, tramite_orden")
      .order("id", { ascending: true })
      .range(pagina * 1000, pagina * 1000 + 999);
    if (activasError) {
      console.error("[cron notificaciones] no se pudo leer notificaciones:", activasError.message);
      limpiezaOmitida = true;
      break;
    }
    if (!activas || activas.length === 0) break;

    const idsExpedientes = Array.from(new Set(activas.map((a) => a.expediente_id as string)));
    const vigentes = new Map<string, { estado: string; tramites_estado: unknown }>();
    for (let i = 0; i < idsExpedientes.length; i += LOTE) {
      const { data: expedientesActuales, error: expError } = await supabaseAdmin
        .from("expedientes")
        .select("id, estado, tramites_estado")
        .in("id", idsExpedientes.slice(i, i + LOTE));
      if (expError) {
        console.error("[cron notificaciones] no se pudieron leer expedientes:", expError.message);
        limpiezaOmitida = true;
        break;
      }
      for (const e of expedientesActuales ?? []) {
        vigentes.set(e.id as string, { estado: e.estado as string, tramites_estado: e.tramites_estado });
      }
    }
    if (limpiezaOmitida) break;

    const idsAEliminar: string[] = [];
    for (const notif of activas) {
      const exp = vigentes.get(notif.expediente_id as string);
      const estados = (exp?.tramites_estado ?? {}) as TramitesEstadoMap;
      const enCurso = estados[String(notif.tramite_orden)]?.estado === "en_curso";
      const expedienteActivo = exp?.estado === "pendiente" || exp?.estado === "en_revision";
      if (!exp || !expedienteActivo || !enCurso) {
        idsAEliminar.push(notif.id as string);
      }
    }

    for (let i = 0; i < idsAEliminar.length; i += LOTE) {
      const lote = idsAEliminar.slice(i, i + LOTE);
      const { error: delError } = await supabaseAdmin.from("notificaciones").delete().in("id", lote);
      if (delError) {
        console.error("[cron notificaciones] borrado fallido:", delError.message);
      } else {
        eliminadas += lote.length;
      }
    }

    if (activas.length < 1000) break;
  }

  return NextResponse.json({ ok: !limpiezaOmitida, expedientesEvaluados: evaluados, escritos, eliminadas, limpiezaOmitida });
}
