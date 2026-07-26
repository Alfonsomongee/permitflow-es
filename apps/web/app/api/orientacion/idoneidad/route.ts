import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const API_URL =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function POST(req: Request) {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Re-enviar request al backend, con el header de la org para rate-limiting
    const response = await fetch(`${API_URL}/api/v1/orientacion/idoneidad`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-org-id": orgId || userId, // Fallback al userId si no hay orgId
        "X-Internal-Key": process.env.INTERNAL_API_KEY ?? "",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || "Error al calcular idoneidad" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in orientacion/idoneidad route:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
