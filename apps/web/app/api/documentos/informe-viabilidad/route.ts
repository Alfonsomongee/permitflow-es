import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const API_URL =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const TECNOLOGIAS_VALIDAS = new Set([
  "fotovoltaica_autoconsumo",
  "climatizacion_aerotermia",
  "irve",
  "acs",
  "gas_baja_presion",
]);

/**
 * Informe de viabilidad geográfica (PREM-05): PDF con marca del instalador
 * a partir de un resultado de idoneidad ya calculado en el navegador (evita
 * repetir la llamada a PVGIS/Geocoding). Disponible en todos los planes,
 * igual que /presupuesto: en el plan gratuito lleva marca de PermitFlow, en
 * Pro/Enterprise sale white-label.
 */
export async function POST(req: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { tecnologia_id, municipio, provincia, referencia_cliente, idoneidad } = body ?? {};

  if (
    !TECNOLOGIAS_VALIDAS.has(tecnologia_id) ||
    typeof municipio !== "string" ||
    !municipio.trim() ||
    typeof provincia !== "string" ||
    !provincia.trim() ||
    !idoneidad
  ) {
    return NextResponse.json({ error: "Faltan datos del informe." }, { status: 400 });
  }

  const { data: org } = await supabaseAdmin
    .from("organizaciones")
    .select("nombre, plan, suscripcion_activa")
    .eq("clerk_org_id", orgId)
    .maybeSingle();

  const esPro = Boolean(org?.suscripcion_activa) || org?.plan === "enterprise";

  let docRes: globalThis.Response;
  try {
    docRes = await fetch(`${API_URL}/api/v1/documentos/informe-viabilidad`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": process.env.INTERNAL_API_KEY ?? "",
      },
      body: JSON.stringify({
        organizacion: {
          nombre: org?.nombre ?? "Informe de viabilidad",
          plan: org?.plan ?? "free",
          marca_permitflow: !esPro,
        },
        tecnologia_id,
        municipio: municipio.trim(),
        provincia: provincia.trim(),
        referencia_cliente: referencia_cliente?.trim() || null,
        idoneidad,
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return NextResponse.json(
      { error: "El servicio de documentos no está disponible." },
      { status: 502 }
    );
  }

  if (!docRes.ok) {
    const detalle = await docRes.json().catch(() => null);
    return NextResponse.json(
      { error: detalle?.detail ?? `Error generando el informe (${docRes.status})` },
      { status: docRes.status }
    );
  }

  return new NextResponse(await docRes.arrayBuffer(), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": docRes.headers.get("Content-Disposition") ?? "attachment",
      "Cache-Control": "no-store",
    },
  });
}
