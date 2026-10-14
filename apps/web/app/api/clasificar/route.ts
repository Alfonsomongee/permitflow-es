import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { contarExpedientesDesde, crearExpediente } from "@/lib/expedientes";
import { supabaseAdmin } from "@/lib/supabase";
import { evaluarCuotaClasificaciones, inicioDeMes, LIMITE_CLASIFICACIONES_FREE_MES } from "@/lib/planes";
import { construirPayloadClasificador } from "@/lib/clasificador-payload";
import type { FormState } from "@/components/nueva-instalacion/types";
import type { PlanTramitacion } from "@/types/plan";
import { API_URL, cabecerasInternas } from "@/lib/server/api";


// Traducciones de los mensajes "de fábrica" que Pydantic v2 genera en inglés
// (Field(gt=0), Field(ge=1)...). En la práctica el backend ya traduce esto en
// main.py::validation_exception_handler antes de que el detail llegue aquí
// como string (rama de arriba), así que este bloque es defensa en
// profundidad para el caso en que `detail` llegue como array sin pasar por
// ese handler (otro servicio, otra ruta). Misma tabla que en main.py -- no
// se puede compartir literalmente entre Python y TypeScript, pero debe
// mantenerse igual si una de las dos cambia (plan de acción consolidado
// 2026-08-12, P-18).
function traducirMensajePydantic(msg: string): string {
  const reglas: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
    [/^Field required$/, () => "Campo obligatorio."],
    [/^Input should be greater than or equal to (-?\d+(?:\.\d+)?)$/, (m) => `Debe ser mayor o igual que ${m[1]}.`],
    [/^Input should be less than or equal to (-?\d+(?:\.\d+)?)$/, (m) => `Debe ser menor o igual que ${m[1]}.`],
    [/^Input should be greater than (-?\d+(?:\.\d+)?)$/, (m) => `Debe ser mayor que ${m[1]}.`],
    [/^Input should be less than (-?\d+(?:\.\d+)?)$/, (m) => `Debe ser menor que ${m[1]}.`],
    [/^Input should be a valid number, unable to parse string as a number$/, () => "Debe ser un número válido."],
    [/^Input should be a valid integer, unable to parse string as an integer$/, () => "Debe ser un número entero válido."],
    [/^Input should be a valid string$/, () => "Debe ser un texto válido."],
    [/^Input should be a valid boolean.*$/, () => "Debe ser verdadero o falso."],
    [/^Input should be (.+)$/, (m) => `El valor debe ser ${m[1].replace(/ or /g, " o ")}.`],
  ];
  for (const [regex, formatear] of reglas) {
    const match = msg.match(regex);
    if (match) return formatear(match);
  }
  return msg;
}

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
          const msgCrudo = String((item as { msg: unknown }).msg ?? "").replace(/^Value error,\s*/, "");
          const msg = traducirMensajePydantic(msgCrudo);
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
    return "Introduce una potencia válida mayor que 0 kW.";
  }

  return null;
}

export async function POST(req: Request) {
  const { userId, orgId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Inicia sesión para generar un expediente." },
      { status: 401 }
    );
  }

  if (!orgId) {
    return NextResponse.json(
      { error: "Selecciona o crea una organización antes de generar expedientes." },
      { status: 403 }
    );
  }

  let formState: FormState;
  try {
    formState = (await req.json()) as FormState;
  } catch {
    return NextResponse.json({ error: "La petición no contiene un JSON válido." }, { status: 400 });
  }
  const validationError = validateFormState(formState);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  // Cuota del plan Free (la tabla de precios promete 5 clasificaciones al mes).
  try {
    const { data: org } = await supabaseAdmin
      .from("organizaciones")
      .select("plan, suscripcion_activa")
      .eq("clerk_org_id", orgId)
      .maybeSingle();
    const usadas = await contarExpedientesDesde(orgId, inicioDeMes());
    if (evaluarCuotaClasificaciones(org, usadas).limitado) {
      return NextResponse.json(
        {
          error:
            `Has alcanzado el límite de ${LIMITE_CLASIFICACIONES_FREE_MES} clasificaciones al mes del plan Free. ` +
            "Pasa a Pro desde Ajustes para clasificar sin límite.",
          upgrade: "/ajustes",
        },
        { status: 402 }
      );
    }
  } catch (err) {
    // Si no se puede comprobar la cuota, no se bloquea al usuario: se registra y se continúa.
    console.error("[clasificar] no se pudo comprobar la cuota del plan:", err);
  }

  let motorRes: Response;
  try {
    motorRes = await fetch(`${API_URL}/api/v1/clasificador`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...cabecerasInternas(),
      },
      signal: AbortSignal.timeout(15000),
      // El payload se construye de forma declarativa en lib/clasificador-payload.ts.
      // Enumerar los campos aquí a mano fue la causa de que 9 variables que las
      // reglas sí usan nunca llegaran al motor (auditoría QA 2026-08-11, C-01).
      body: JSON.stringify(construirPayloadClasificador(formState)),
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo conectar con el motor normativo. Inténtalo de nuevo en unos minutos." },
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
    // El detalle (mensajes de Postgres/PostgREST) va a los logs, no al navegador.
    console.error("[clasificar] el plan se generó pero no se pudo guardar el expediente:", err);
    return NextResponse.json(
      { error: "El plan se generó, pero no se pudo guardar el expediente. Inténtalo de nuevo." },
      { status: 500 }
    );
  }
}
