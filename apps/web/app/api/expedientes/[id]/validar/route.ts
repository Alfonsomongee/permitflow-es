import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { obtenerExpediente } from "@/lib/expedientes";
import { supabaseAdmin } from "@/lib/supabase";
import { API_URL, cabecerasInternas } from "@/lib/server/api";


export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const params = await ctx.params;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const expediente = await obtenerExpediente(params.id, orgId);
  if (!expediente) {
    return NextResponse.json({ error: "Expediente no encontrado" }, { status: 404 });
  }

  const { data: org } = await supabaseAdmin
    .from("organizaciones")
    .select("plan, suscripcion_activa")
    .eq("clerk_org_id", orgId)
    .maybeSingle();

  const habilitado = org?.suscripcion_activa || org?.plan === "enterprise";
  if (!habilitado) {
    return NextResponse.json(
      { error: "El validador pre-presentación es una función del plan Pro.", upgrade: "/#precios" },
      { status: 402 }
    );
  }

  // Payload completo con el que se generó el plan. Los expedientes anteriores a
  // 2026-10 solo conservan 12 campos (`parametros` null): con ellos el motor
  // rechaza o evalúa a medias muchas combinaciones (Madrid, Cataluña, ACS...).
  const esLegado = expediente.parametros == null;
  const payload = expediente.parametros ?? {
    tipo_instalacion: expediente.tipo_instalacion,
    comunidad: expediente.comunidad,
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
  };

  let motorRes: globalThis.Response;
  try {
    motorRes = await fetch(`${API_URL}/api/v1/validador`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...cabecerasInternas(),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return NextResponse.json(
      { error: "El servicio de validación no está disponible" },
      { status: 502 }
    );
  }

  const data = await motorRes.json().catch(() => null);
  if (!motorRes.ok) {
    if (esLegado && motorRes.status === 422) {
      return NextResponse.json(
        {
          error:
            "Este expediente se creó antes de guardar todos los datos del formulario, " +
            "así que no se puede validar. Crea un expediente nuevo con los mismos datos " +
            "para usar el validador.",
          legado: true,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: data?.detail ?? `Error del validador (${motorRes.status})` },
      { status: motorRes.status }
    );
  }
  return NextResponse.json(data);
}
