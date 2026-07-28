import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { crearExpediente } from "@/lib/expedientes";
import type { FormState } from "@/components/nueva-instalacion/types";
import type { PlanTramitacion } from "@/types/plan";

const API_URL =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Convierte el campo `detail` de un error de FastAPI en un string legible,
 * sin importar la forma en la que venga (string ya formateado, lista de errores
 * de validación de Pydantic, u objeto suelto). Defensa en profundidad para que
 * el frontend nunca reciba algo que se renderice como "[object Object]".
 */
function stringifyErrorDetail(detail: unknown): string | null {
  if (detail == null) return null;
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const mensajes = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) {
          const loc = Array.isArray((item as { loc?: unknown[] }).loc)
            ? (item as { loc: unknown[] }).loc.filter((p) => p !== "body").join(".")
            : "";
          const msg = String((item as { msg: unknown }).msg ?? "").replace(/^Value error,\s*/, "");
          return loc ? `${loc}: ${msg}` : msg;
        }
        return null;
      })
      .filter((m): m is string => Boolean(m));
    return mensajes.length > 0 ? mensajes.join("; ") : JSON.stringify(detail);
  }

  if (typeof detail === "object") {
    if ("msg" in detail) return String((detail as { msg: unknown }).msg);
    try {
      return JSON.stringify(detail);
    } catch {
      return "Error desconocido del motor normativo.";
    }
  }

  return String(detail);
}

function validateFormState(formState: FormState): string | null {
  if (!formState?.tipo_instalacion || !formState?.comunidad) {
    return "Faltan campos obligatorios para clasificar.";
  }

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
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": process.env.INTERNAL_API_KEY ?? "",
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        tipo_instalacion: formState.tipo_instalacion,
        comunidad: formState.comunidad,
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
        tension: formState.tension ?? undefined,
        nivel_tension_consumidor: formState.nivel_tension_consumidor ?? undefined,
        nivel_tension_generacion: formState.nivel_tension_generacion ?? undefined,
        nivel_tension_conexion: formState.nivel_tension_conexion ?? undefined,
        modalidad_autoconsumo: formState.modalidad_autoconsumo || undefined,
        ubicacion_suelo: formState.ubicacion_suelo || undefined,
        requiere_acceso_conexion: formState.requiere_acceso_conexion,
        inversion_eur: formState.inversion_eur
          ? parseFloat(formState.inversion_eur)
          : undefined,
        potencia_resultante_kw: formState.potencia_resultante_kw
          ? parseFloat(formState.potencia_resultante_kw)
          : undefined,
        presion_resultante_bar: formState.presion_resultante_bar
          ? parseFloat(formState.presion_resultante_bar)
          : undefined,
        es_ampliacion: formState.es_ampliacion,
        incremento_potencia_pct: formState.incremento_potencia_pct
          ? parseFloat(formState.incremento_potencia_pct)
          : undefined,
        uso_edificio: formState.uso_edificio || undefined,
        ventilacion_garaje: formState.ventilacion_garaje || undefined,
        numero_plazas_garaje: formState.numero_plazas_garaje
          ? parseInt(formState.numero_plazas_garaje, 10)
          : undefined,
        garaje_existente: formState.garaje_existente,
        acs_centralizada: formState.acs_centralizada,
        incluida_ambito_legionella: formState.incluida_ambito_legionella,
        dispone_acumulacion: formState.dispone_acumulacion,
        dispone_circuito_retorno: formState.dispone_circuito_retorno,
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
      { error: stringifyErrorDetail(detail?.detail) ?? "Error en el motor normativo." },
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
