import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { alertasParaDigest, construirHtmlDigest } from "@/lib/digestNormativo";
import { emailsDeOrganizacion } from "@/lib/clerk-org-emails";
import type { ExpedienteMatch } from "@/lib/alertas";

export const maxDuration = 60;

/**
 * Cron semanal: "radar normativo personalizado" (QW-02, roadmap de
 * mejoras). Complementa el filtro en pantalla de AlertasBoeList.tsx --
 * antes ese filtro solo ayudaba a quien entraba a mirar; esto le lleva el
 * aviso sin que tenga que acordarse de entrar.
 *
 * Solo envía a organizaciones con al menos una alerta nueva relevante para
 * su cartera en los últimos 7 días: una organización sin nada relevante no
 * recibe email vacío. Sin RESEND_API_KEY configurada, se salta el envío
 * (no hay integración de email en local/CI) mismo criterio que
 * routers/contacto.py -- pero aquí no se puede devolver un 503 al usuario
 * porque no hay ningún usuario esperando una respuesta HTTP, así que solo
 * se registra en la respuesta del cron para que quede constancia.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return handle();
}

// Los Cron Jobs de Vercel invocan por GET (ver la misma nota en
// app/api/cron/estadisticas-plazos/route.ts).
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return handle();
}

async function enviarDigest(destinatarios: string[], html: string, resumen: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || destinatarios.length === 0) return false;

  const fromDomain = process.env.RESEND_FROM_DOMAIN || "permitflow.es";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `Radar normativo PermitFlow <noreply@${fromDomain}>`,
      to: destinatarios,
      subject: resumen,
      html,
    }),
  });
  return res.ok;
}

async function handle() {
  const apiKeyConfigurada = !!process.env.RESEND_API_KEY;

  const desde = new Date();
  desde.setUTCDate(desde.getUTCDate() - 7);
  const desdeIso = desde.toISOString();

  const { data: alertas } = await supabaseAdmin
    .from("alertas_boe")
    .select("*")
    .gte("creado_en", desdeIso)
    .order("creado_en", { ascending: false });

  if (!alertas || alertas.length === 0) {
    return NextResponse.json({ organizaciones: 0, enviados: 0, motivo: "sin alertas nuevas en 7 días" });
  }

  const { data: organizaciones } = await supabaseAdmin
    .from("organizaciones")
    .select("id, clerk_org_id, nombre");

  let evaluadas = 0;
  let enviados = 0;
  let sinDestinatario = 0;

  for (const org of organizaciones ?? []) {
    evaluadas++;

    const { data: expedientesRaw } = await supabaseAdmin
      .from("expedientes")
      .select("id, comunidad, tipo_instalacion, estado, referencia_cliente")
      .eq("org_id", org.id);

    const expedientes: ExpedienteMatch[] = (expedientesRaw ?? []) as ExpedienteMatch[];
    // Sin cartera, alertaRelevanteParaCartera considera todo relevante --
    // pero eso inundaría de emails a organizaciones que ni siquiera han
    // creado un expediente todavía. El digest, a diferencia del filtro en
    // pantalla, solo tiene sentido con cartera real.
    if (expedientes.length === 0) continue;

    const relevantes = alertasParaDigest(alertas, expedientes, desdeIso);
    if (relevantes.length === 0) continue;

    const destinatarios = await emailsDeOrganizacion(org.clerk_org_id);
    if (destinatarios.length === 0) {
      sinDestinatario++;
      continue;
    }

    const html = construirHtmlDigest(relevantes, org.nombre);
    const resumen = `${relevantes.length} cambio${relevantes.length === 1 ? "" : "s"} normativo${relevantes.length === 1 ? "" : "s"} que te afecta${relevantes.length === 1 ? "" : "n"} esta semana`;

    if (apiKeyConfigurada && (await enviarDigest(destinatarios, html, resumen))) {
      enviados++;
    }
  }

  return NextResponse.json({
    organizaciones: evaluadas,
    enviados,
    sinDestinatario,
    apiKeyConfigurada,
  });
}
