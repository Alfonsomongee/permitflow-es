import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { claveTramite, MUESTRA_MINIMA } from "@/lib/tramiteClave";
import { diasEntre } from "@/lib/plazos";
import type { PlanTramitacion } from "@/types/plan";

export const maxDuration = 60;

interface Muestra {
  nombreTramite: string;
  plazoLegalDias: number | null;
  dias: number[];
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const PAGE = 500;
  const acumulado = new Map<string, Muestra>(); // clave: comunidad|tipo|claveTramite
  let desde = 0;

  for (;;) {
    const { data, error } = await supabaseAdmin
      .from("expedientes")
      .select("comunidad, tipo_instalacion, plan_tramitacion, tramites_estado")
      .not("plan_tramitacion", "is", null)
      .range(desde, desde + PAGE - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) break;

    for (const expediente of data) {
      const plan = expediente.plan_tramitacion as PlanTramitacion | null;
      const estados = expediente.tramites_estado as Record<
        string,
        { estado: string; fecha_inicio: string | null; fecha_completado: string | null }
      > | null;
      if (!plan?.tramites || !estados) continue;

      for (const [ordenStr, info] of Object.entries(estados)) {
        if (info.estado !== "completado" || !info.fecha_inicio || !info.fecha_completado) {
          continue;
        }
        const tramite = plan.tramites.find((t) => t.orden === Number(ordenStr));
        if (!tramite) continue;

        const dias = diasEntre(info.fecha_inicio, info.fecha_completado);
        if (dias < 0 || dias > 3650) continue; // fecha corrupta o mal introducida: descartar

        const clave = claveTramite(tramite);
        const llave = `${expediente.comunidad}|${expediente.tipo_instalacion}|${clave}`;
        const muestra = acumulado.get(llave) ?? {
          nombreTramite: tramite.nombre,
          plazoLegalDias: tramite.plazo_legal_dias,
          dias: [],
        };
        muestra.dias.push(dias);
        acumulado.set(llave, muestra);
      }
    }

    desde += PAGE;
    if (data.length < PAGE) break;
  }

  let escritos = 0;
  for (const [llave, muestra] of Array.from(acumulado.entries())) {
    if (muestra.dias.length < MUESTRA_MINIMA) continue; // umbral de privacidad

    const [comunidad, tipoInstalacion, claveTramiteVal] = llave.split("|");
    const ordenado = [...muestra.dias].sort((a, b) => a - b);
    const media = ordenado.reduce((a, b) => a + b, 0) / ordenado.length;
    const mediana =
      ordenado.length % 2 === 0
        ? (ordenado[ordenado.length / 2 - 1] + ordenado[ordenado.length / 2]) / 2
        : ordenado[Math.floor(ordenado.length / 2)];

    const { error } = await supabaseAdmin.from("estadisticas_plazos").upsert(
      {
        comunidad,
        tipo_instalacion: tipoInstalacion,
        clave_tramite: claveTramiteVal,
        nombre_tramite: muestra.nombreTramite,
        plazo_legal_dias: muestra.plazoLegalDias,
        muestra_n: muestra.dias.length,
        media_real_dias: Math.round(media * 10) / 10,
        mediana_real_dias: Math.round(mediana * 10) / 10,
        actualizado_en: new Date().toISOString(),
      },
      { onConflict: "comunidad,tipo_instalacion,clave_tramite" }
    );
    if (!error) escritos++;
  }

  return NextResponse.json({ ok: true, combinacionesEvaluadas: acumulado.size, escritos });
}
