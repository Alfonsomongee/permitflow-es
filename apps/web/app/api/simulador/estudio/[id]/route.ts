import { NextResponse } from "next/server";
import { API_URL, cabecerasInternas } from "@/lib/server/api";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const params = await ctx.params;
  // `params.id` se interpola en la ruta de FastAPI: solo UUID (evita `..%2F` y
  // otras inyecciones de ruta hacia endpoints internos).
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id)) {
    return NextResponse.json({ detail: "Identificador de estudio inválido" }, { status: 400 });
  }

  // Extraer token del header que envía el cliente
  const token = request.headers.get("X-Estudio-Token") ?? "";

  try {
    const response = await fetch(`${API_URL}/simulador/estudio/${params.id}`, {
      headers: cabecerasInternas(request, { "X-Estudio-Token": token }),
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : { detail: "Respuesta inválida del servicio" };

    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    console.error(`[SIMULADOR] Error en el proxy del estudio ${params.id}:`, error);
    return NextResponse.json(
      { detail: "Error de red conectando con el servicio de simulación" },
      { status: 502 }
    );
  }
}
