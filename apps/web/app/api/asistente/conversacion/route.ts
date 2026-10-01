/**
 * apps/web/app/api/asistente/conversacion/route.ts
 *
 * Proxy de solo lectura hacia GET /api/v1/asistente/conversacion: devuelve
 * la conversación más reciente del usuario (para el expediente indicado, o
 * la conversación general si no se pasa expediente_id) para que ChatWidget
 * pueda recuperar el historial al reabrirse en vez de partir de cero
 * (mejoras 2026-08-07).
 */
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { API_URL, cabecerasInternas } from "@/lib/server/api";


export async function GET(req: Request) {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const expedienteId = searchParams.get("expediente_id");
  const qs = expedienteId ? `?expediente_id=${encodeURIComponent(expedienteId)}` : "";

  try {
    const res = await fetch(`${API_URL}/api/v1/asistente/conversacion${qs}`, {
      method: "GET",
      headers: {
        ...cabecerasInternas(),
        "x-org-id": orgId,
        "x-user-id": userId,
      },
      cache: "no-store",
    });

    const body = await res.json().catch(() => null);
    return NextResponse.json(body, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: "No se pudo conectar con el servicio de IA." },
      { status: 502 }
    );
  }
}
