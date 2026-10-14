import { NextResponse } from "next/server";
import { API_URL, cabecerasInternas } from "@/lib/server/api";

// Proxy público (sin Clerk auth: /contacto vive en la landing, antes de
// cualquier registro) hacia apps/api/routers/contacto.py. INTERNAL_API_KEY
// se añade aquí, server-side, para que la ruta de FastAPI (protegida por el
// gate global de seguridad.py) solo sea alcanzable a través de este proxy,
// nunca directamente desde el navegador.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "JSON inválido" }, { status: 400 });
  }

  try {
    const response = await fetch(`${API_URL}/contacto`, {
      method: "POST",
      headers: cabecerasInternas(request, { "Content-Type": "application/json" }),
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : { detail: "Respuesta inválida del servicio" };

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[CONTACTO] Error en el proxy:", error);
    return NextResponse.json(
      { detail: "Error de red conectando con el servicio de contacto" },
      { status: 502 }
    );
  }
}
