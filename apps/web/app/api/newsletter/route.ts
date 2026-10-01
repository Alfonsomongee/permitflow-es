import { NextResponse } from "next/server";
import { API_URL, cabecerasInternas } from "@/lib/server/api";

// Proxy público (sin Clerk auth: el formulario de newsletter vive en el
// footer de la landing) hacia apps/api/routers/newsletter.py. Mismo patrón
// que apps/web/app/api/contacto/route.ts: INTERNAL_API_KEY se añade aquí,
// server-side, para que la ruta de FastAPI (protegida por el gate global de
// seguridad.py) solo sea alcanzable a través de este proxy.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "JSON inválido" }, { status: 400 });
  }

  try {
    const response = await fetch(`${API_URL}/newsletter`, {
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
    console.error("[NEWSLETTER] Error en el proxy:", error);
    return NextResponse.json(
      { detail: "Error de red conectando con el servicio de newsletter" },
      { status: 502 }
    );
  }
}
