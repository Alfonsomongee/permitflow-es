import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const INTERNAL_KEY = process.env.INTERNAL_API_KEY || "";

  if (!API_URL) {
    return NextResponse.json({ detail: "Servicio no configurado" }, { status: 503 });
  }

  // Extraer token del header que envía el cliente
  const token = request.headers.get("X-Estudio-Token") ?? "";

  try {
    const response = await fetch(`${API_URL}/simulador/estudio/${params.id}`, {
      headers: {
        "X-Internal-Key": INTERNAL_KEY,
        "X-Estudio-Token": token,
      },
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
