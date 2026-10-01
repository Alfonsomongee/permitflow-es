import { NextResponse } from "next/server";
import { API_URL, cabecerasInternas } from "@/lib/server/api";

// Mismo patrón que ../route.ts (proxy de la factura en PDF), pero hacia
// /simulador/factura/csv -- import del export de consumo de Datadis.
export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const response = await fetch(`${API_URL}/simulador/factura/csv`, {
      method: "POST",
      headers: cabecerasInternas(request),
      body: formData,
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : { detail: "Respuesta inválida del servicio" };

    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    console.error("[SIMULADOR] Error en el proxy de factura CSV:", error);
    return NextResponse.json(
      { detail: "Error de red conectando con el servicio de simulación" },
      { status: 502 }
    );
  }
}
