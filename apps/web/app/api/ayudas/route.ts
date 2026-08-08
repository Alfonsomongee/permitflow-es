import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

const rawUrl =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_URL = rawUrl.replace(/\/+$/, "");

/**
 * apps/web/app/api/ayudas/route.ts
 *
 * Proxy de solo lectura al catálogo de ayudas y subvenciones (servicios/catalogo_ayudas.py
 * en el backend). Reenvía comunidad + tipo_instalacion como query params.
 */
export async function GET(req: Request) {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const comunidad = searchParams.get("comunidad");
    const tipoInstalacion = searchParams.get("tipo_instalacion");

    if (!comunidad || !tipoInstalacion) {
      return NextResponse.json(
        { error: "Faltan parámetros: comunidad y tipo_instalacion son obligatorios" },
        { status: 400 }
      );
    }

    const backendUrl = new URL(`${API_URL}/api/v1/ayudas/simular`);
    backendUrl.searchParams.set("comunidad", comunidad);
    backendUrl.searchParams.set("tipo_instalacion", tipoInstalacion);

    const response = await fetch(backendUrl.toString(), {
      method: "GET",
      headers: {
        "x-org-id": orgId || userId,
        "X-Internal-Key": process.env.INTERNAL_API_KEY ?? "",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || "Error al consultar el catálogo de ayudas" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in ayudas route:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
