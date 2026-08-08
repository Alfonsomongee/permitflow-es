import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { PlanTramitacion } from "@/types/plan";
import {
  BUCKET_DOCUMENTOS_CLIENTE,
  MAX_SUBIDAS_POR_DIA,
  MAX_TAMANO_BYTES,
  MIME_PERMITIDOS,
  esTokenValido,
  resolverDocumentoDelPlan,
  sanearNombreArchivo,
} from "@/lib/documentos-cliente";

/**
 * apps/web/app/api/portal/[token]/documentos/route.ts
 *
 * Portal de cliente bidireccional -- primera pieza (2026-08-08): el
 * propietario final puede subir documentación pendiente desde el enlace
 * público, sin cuenta, igual que ya puede ver el estado (portal/[token]).
 * El token opaco es la única credencial: no hay sesión ni Clerk aquí.
 *
 * GET  -> lista lo ya subido (para que el portal muestre "ya subiste X").
 * POST -> sube un archivo para un (tramite_orden, documento_id) concreto.
 */

async function resolverExpedientePorToken(token: string) {
  if (!esTokenValido(token)) return null;
  const { data } = await supabaseAdmin
    .from("expedientes")
    .select("id, org_id, plan_tramitacion")
    .eq("share_token", token)
    .maybeSingle();
  return data;
}

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const expediente = await resolverExpedientePorToken(params.token);
  if (!expediente) {
    return NextResponse.json({ error: "Enlace no válido" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("documentos_cliente")
    .select("id, tramite_orden, documento_id, nombre_original, subido_en")
    .eq("expediente_id", expediente.id)
    .order("subido_en", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ documentos: data ?? [] });
}

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  const expediente = await resolverExpedientePorToken(params.token);
  if (!expediente) {
    return NextResponse.json({ error: "Enlace no válido" }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Formulario inválido" }, { status: 400 });
  }

  const file = form.get("file");
  const tramiteOrdenRaw = form.get("tramite_orden");
  const documentoId = form.get("documento_id");

  if (!(file instanceof File) || typeof tramiteOrdenRaw !== "string" || typeof documentoId !== "string") {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  const tramiteOrden = Number.parseInt(tramiteOrdenRaw, 10);
  if (!Number.isFinite(tramiteOrden)) {
    return NextResponse.json({ error: "tramite_orden inválido" }, { status: 400 });
  }

  // El documento tiene que existir de verdad en el plan de este expediente
  // concreto y ser un trámite accionable por el propietario -- evita subir
  // archivos "colgados" de un documento que ni se le muestra en el portal.
  const plan = expediente.plan_tramitacion as PlanTramitacion | null;
  const doc = resolverDocumentoDelPlan(plan, tramiteOrden, documentoId);
  if (!doc) {
    return NextResponse.json({ error: "Documento no reconocido para este expediente" }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "El archivo está vacío" }, { status: 400 });
  }
  if (file.size > MAX_TAMANO_BYTES) {
    return NextResponse.json({ error: "El archivo supera los 15MB permitidos" }, { status: 413 });
  }
  if (!MIME_PERMITIDOS.has(file.type)) {
    return NextResponse.json(
      { error: "Formato no admitido. Solo PDF, JPG o PNG." },
      { status: 415 }
    );
  }

  // Sin rate limiting por IP disponible en este runtime: freno de volumen
  // por expediente en 24h como defensa mínima ante un token filtrado.
  const desde24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("documentos_cliente")
    .select("id", { count: "exact", head: true })
    .eq("expediente_id", expediente.id)
    .gte("subido_en", desde24h);

  if ((count ?? 0) >= MAX_SUBIDAS_POR_DIA) {
    return NextResponse.json(
      { error: "Se ha alcanzado el límite de subidas para hoy. Inténtalo mañana." },
      { status: 429 }
    );
  }

  const nombreSaneado = sanearNombreArchivo(file.name || "archivo");
  const storagePath = `${expediente.id}/${doc.tramiteOrden}/${doc.documentoId}/${randomUUID()}-${nombreSaneado}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET_DOCUMENTOS_CLIENTE)
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json(
      { error: "No se pudo subir el archivo. Inténtalo de nuevo." },
      { status: 502 }
    );
  }

  const { data: fila, error: insertError } = await supabaseAdmin
    .from("documentos_cliente")
    .insert({
      expediente_id: expediente.id,
      tramite_orden: doc.tramiteOrden,
      documento_id: doc.documentoId,
      documento_label: doc.documentoLabel,
      nombre_original: nombreSaneado,
      storage_path: storagePath,
      tamano_bytes: file.size,
      tipo_mime: file.type,
    })
    .select("id, tramite_orden, documento_id, nombre_original, subido_en")
    .single();

  if (insertError || !fila) {
    // El archivo ya está en storage pero no se pudo registrar: lo borramos
    // para no dejar basura huérfana que nadie referenciará nunca.
    await supabaseAdmin.storage.from(BUCKET_DOCUMENTOS_CLIENTE).remove([storagePath]);
    return NextResponse.json({ error: "No se pudo registrar el documento" }, { status: 500 });
  }

  return NextResponse.json({ documento: fila }, { status: 201 });
}
