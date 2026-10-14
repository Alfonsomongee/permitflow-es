import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { construirPayloadClasificador } from "@/lib/clasificador-payload";
import type { FormState } from "@/components/nueva-instalacion/types";
import type { PlanTramitacion } from "@/types/plan";
import { API_URL, cabecerasInternas } from "@/lib/server/api";


/**
 * Presupuesto comercial: clasifica sin persistir expediente y devuelve un PDF
 * de una página para adjuntar a una oferta.
 *
 * Disponible en TODOS los planes (a diferencia de /documentos): en el plan
 * gratuito el PDF lleva marca de PermitFlow; en Pro sale con la marca de la
 * organización únicamente.
 */
export async function POST(req: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let formState: FormState;
  try {
    formState = (await req.json()) as FormState;
  } catch {
    return NextResponse.json({ error: "La petición no contiene un JSON válido." }, { status: 400 });
  }
  if (!formState?.tipo_instalacion || !formState?.comunidad) {
    return NextResponse.json(
      { error: "Faltan datos de la instalación." },
      { status: 400 }
    );
  }
  const potencia = parseFloat(formState.potencia_kw);
  if (Number.isNaN(potencia) || potencia <= 0) {
    return NextResponse.json(
      { error: "Introduce una potencia válida mayor que 0 kW." },
      { status: 400 }
    );
  }

  const paramsInstalacion = {
    tipo_instalacion: formState.tipo_instalacion,
    comunidad: formState.comunidad,
    potencia_kw: potencia,
    uso: formState.uso,
    numero_puntos: formState.numero_puntos
      ? parseInt(formState.numero_puntos, 10)
      : undefined,
    potencia_por_punto_kw: formState.potencia_por_punto_kw
      ? parseFloat(formState.potencia_por_punto_kw)
      : undefined,
    modo_recarga: formState.modo_recarga || undefined,
    acceso_publico: formState.acceso_publico,
    ubicacion_irve: formState.ubicacion_irve || undefined,
    requiere_nuevo_suministro: formState.requiere_nuevo_suministro,
    combustible: formState.combustible || undefined,
    presion_bar: formState.presion_bar || undefined,
    solicita_ayuda: formState.solicita_ayuda,
  };

  // 1. Clasificar (stateless: no se crea expediente)
  let motorRes: globalThis.Response;
  try {
    motorRes = await fetch(`${API_URL}/api/v1/clasificador`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...cabecerasInternas(),
      },
      // Payload COMPLETO del formulario (no la lista manual de 12 campos de
      // `paramsInstalacion`, que omitía tensión, modalidad, etc. y daba un plan
      // distinto al de /api/clasificar para el mismo caso).
      body: JSON.stringify(construirPayloadClasificador(formState)),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo conectar con el motor normativo." },
      { status: 502 }
    );
  }
  if (!motorRes.ok) {
    const detalle = await motorRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: detalle?.detail ?? "Error en el motor normativo." },
      { status: motorRes.status }
    );
  }
  const plan = (await motorRes.json()) as PlanTramitacion;

  // 2. Marca: gratuito = con marca PermitFlow; Pro/Enterprise = white-label
  const { data: org } = await supabaseAdmin
    .from("organizaciones")
    .select("nombre, plan, suscripcion_activa")
    .eq("clerk_org_id", orgId)
    .maybeSingle();

  const esPro = Boolean(org?.suscripcion_activa) || org?.plan === "enterprise";

  // 3. Renderizar PDF
  let docRes: globalThis.Response;
  try {
    docRes = await fetch(`${API_URL}/api/v1/documentos/generar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...cabecerasInternas(),
      },
      body: JSON.stringify({
        tipo: "presupuesto",
        organizacion: {
          nombre: org?.nombre ?? "Presupuesto de tramitación",
          plan: org?.plan ?? "free",
          marca_permitflow: !esPro,
        },
        expediente: {
          id: "",
          ...paramsInstalacion,
          referencia_cliente: formState.referencia_cliente?.trim() || null,
        },
        plan,
        tramites_estado: {},
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
      { error: detalle?.detail ?? `Error generando el presupuesto (${docRes.status})` },
      { status: docRes.status }
    );
  }

  return new NextResponse(await docRes.arrayBuffer(), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        docRes.headers.get("Content-Disposition") ?? "attachment",
      "Cache-Control": "no-store",
    },
  });
}
