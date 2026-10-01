import { NextResponse } from "next/server";
import { API_URL, cabecerasInternas } from "@/lib/server/api";

export async function POST(request: Request) {
  try {
    const requestBody = await request.json();

    const response = await fetch(`${API_URL}/simulador/generar`, {
      method: "POST",
      headers: cabecerasInternas(request, { "Content-Type": "application/json" }),
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : { detail: "Respuesta inválida del servicio" };

    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    console.error("[SIMULADOR] Error en el proxy de generar informe:", error);
    return NextResponse.json(
      { detail: "Error de red conectando con el servicio de simulación" },
      { status: 502 }
    );
  }
}
