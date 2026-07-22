import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { obtenerExpediente } from "@/lib/expedientes";
import { supabaseAdmin } from "@/lib/supabase";

const API_URL =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const TIPOS_VALIDOS = new Set(["plan", "checklist", "mtd", "dossier"]);

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const tipo = new URL(req.url).searchParams.get("tipo") ?? "";
  if (!TIPOS_VALIDOS.has(tipo)) {
    return NextResponse.json({ error: "Tipo de documento inválido" }, { status: 400 });
  }

  // Scoping: obtenerExpediente ya filtra por organización (evita IDOR)
  const expediente = await obtenerExpediente(params.id, orgId);
  if (!expediente) {
    return NextResponse.json({ error: "Expediente no encontrado" }, { status: 404 });
  }
  if (!expediente.plan_tramitacion) {
    return NextResponse.json(
      { error: "El expediente no tiene plan de tramitación generado" },
      { status: 409 }
    );
  }

  const { data: org } = await supabaseAdmin
    .from("organizaciones")
    .select("nombre, plan, suscripcion_activa")
    .eq("clerk_org_id", orgId)
    .maybeSingle();

  if (!org) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 403 });
  }

  // Gate de monetización: documentos = plan Pro / Enterprise.
  const habilitado = org.suscripcion_activa || org.plan === "enterprise";
  if (!habilitado) {
    return NextResponse.json(
      {
        error: "La generación de documentos es una función del plan Pro.",
        upgrade: "/#precios",
      },
      { status: 402 }
    );
  }

  const payload = {
    tipo,
    organizacion: { nombre: org.nombre, plan: org.plan },
    expediente: {
      id: expediente.id,
      tipo_instalacion: expediente.tipo_instalacion,
      comunidad: expediente.comunidad,
      municipio: expediente.municipio,
      potencia_kw: expediente.potencia_kw,
      uso: expediente.uso,
      numero_puntos: expediente.numero_puntos,
      modo_recarga: expediente.modo_recarga,
      acceso_publico: expediente.acceso_publico,
      ubicacion_irve: expediente.ubicacion_irve,
      requiere_nuevo_suministro: expediente.requiere_nuevo_suministro,
      combustible: expediente.combustible,
      presion_bar: expediente.presion_bar,
      solicita_ayuda: expediente.solicita_ayuda,
      referencia_cliente: expediente.referencia_cliente,
      notas: expediente.notas,
      creado_en: expediente.creado_en,
    },
    plan: expediente.plan_tramitacion,
    tramites_estado: expediente.tramites_estado ?? {},
  };

  let motorRes: globalThis.Response;
  try {
    motorRes = await fetch(`${API_URL}/api/v1/documentos/generar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return NextResponse.json(
      { error: "El servicio de documentos no está disponible" },
      { status: 502 }
    );
  }

  if (!motorRes.ok) {
    const detalle = await motorRes.json().catch(() => null);
    return NextResponse.json(
      { error: detalle?.detail ?? `Error generando documento (${motorRes.status})` },
      { status: motorRes.status }
    );
  }

  const contenido = await motorRes.arrayBuffer();
  return new NextResponse(contenido, {
    status: 200,
    headers: {
      "Content-Type": motorRes.headers.get("Content-Type") ?? "application/octet-stream",
      "Content-Disposition":
        motorRes.headers.get("Content-Disposition") ?? "attachment",
      "Cache-Control": "no-store",
    },
  });
}
