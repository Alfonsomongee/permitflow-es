/**
 * apps/web/app/api/asistente/reportar/route.ts
 *
 * Proxy hacia POST /api/v1/asistente/reportar: el schema
 * AsistenteReporteRequest existía en el backend desde hace tiempo pero
 * ningún endpoint lo usaba y no había forma de llegar a él desde la UI
 * (mejoras 2026-08-07).
 */
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const rawUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_URL = rawUrl.replace(/\/+$/, "");

export async function POST(req: Request) {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  try {
    const res = await fetch(`${API_URL}/api/v1/asistente/reportar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": process.env.INTERNAL_API_KEY ?? "",
        "x-org-id": orgId,
        "x-user-id": userId,
      },
      body: JSON.stringify(body),
    });

    const responseBody = await res.json().catch(() => null);
    return NextResponse.json(responseBody, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: "No se pudo conectar con el servicio de IA." },
      { status: 502 }
    );
  }
}
