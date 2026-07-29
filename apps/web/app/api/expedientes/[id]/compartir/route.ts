import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { obtenerOCrearShareToken } from "@/lib/expedientes";

/**
 * Genera (o devuelve) el enlace del portal de cliente de solo lectura para
 * este expediente. POST con { regenerar: true } rota el token, invalidando
 * cualquier enlace ya compartido antes.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { regenerar?: boolean };

  try {
    const token = await obtenerOCrearShareToken(params.id, orgId, body.regenerar === true);
    return NextResponse.json({ token });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    if (message === "EXPEDIENTE_NO_ENCONTRADO") {
      return NextResponse.json({ error: "Expediente no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
