import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { crearExpediente } from "@/lib/expedientes";
import type { FormState } from "@/components/nueva-instalacion/types";
import type { PlanTramitacion } from "@/types/plan";

const API_URL =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function validateFormState(formState: FormState): string | null {
  if (!formState.tipo_instalacion) return "Selecciona el tipo de instalacion.";
  if (!formState.comunidad) return "Selecciona una comunidad autonoma.";
  if (!formState.municipio?.trim()) return "Indica el municipio de la instalacion.";

  const potencia = parseFloat(formState.potencia_kw);
  if (!formState.potencia_kw || Number.isNaN(potencia) || potencia <= 0) {
    return "Introduce una potencia valida mayor que 0 kW.";
  }

  return null;
}

export async function POST(req: Request) {
  const { userId, orgId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Inicia sesion para generar un expediente." },
      { status: 401 }
    );
  }

  if (!orgId) {
    return NextResponse.json(
      { error: "Selecciona o crea una organizacion antes de generar expedientes." },
      { status: 403 }
    );
  }

  const formState = (await req.json()) as FormState;
  const validationError = validateFormState(formState);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  let motorRes: Response;
  try {
    motorRes = await fetch(`${API_URL}/api/v1/clasificador`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        tipo_instalacion: formState.tipo_instalacion,
        comunidad: formState.comunidad,
        municipio: formState.municipio,
        potencia_kw: parseFloat(formState.potencia_kw) || 0,
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
      }),
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo conectar con el motor normativo. Revisa que FastAPI este activo." },
      { status: 502 }
    );
  }

  if (!motorRes.ok) {
    const detail = await motorRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: detail?.detail ?? "Error en el motor normativo." },
      { status: motorRes.status }
    );
  }

  const plan = (await motorRes.json()) as PlanTramitacion;

  try {
    const expediente = await crearExpediente({
      clerkOrgId: orgId,
      clerkUserId: userId,
      formState,
      plan,
    });

    return NextResponse.json({ expedienteId: expediente.id, plan });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "El plan se genero, pero no se pudo guardar el expediente.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
