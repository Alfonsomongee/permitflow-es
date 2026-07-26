import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const API_URL =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function POST(req: Request) {
  const { userId, orgId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Inicia sesion para usar el asistente." },
      { status: 401 }
    );
  }

  if (!orgId) {
    return NextResponse.json(
      { error: "Selecciona o crea una organizacion para usar el asistente." },
      { status: 403 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Peticion invalida" }, { status: 400 });
  }

  try {
    const motorRes = await fetch(`${API_URL}/api/v1/asistente/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": process.env.INTERNAL_API_KEY ?? "",
        "x-org-id": orgId,
      },
      body: JSON.stringify(body),
    });

    if (!motorRes.ok) {
      let errorMsg = "Error interno del servidor";
      try {
        const err = await motorRes.json();
        if (err.detail) {
          errorMsg = err.detail;
        }
      } catch {}
      return NextResponse.json(
        { error: errorMsg },
        { status: motorRes.status }
      );
    }

    // Stream the response back to the client
    return new Response(motorRes.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    return NextResponse.json(
      { error: "No se pudo conectar con el servicio de IA." },
      { status: 502 }
    );
  }
}
