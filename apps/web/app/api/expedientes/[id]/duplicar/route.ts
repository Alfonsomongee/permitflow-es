import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { duplicarExpediente } from "@/lib/expedientes";

/**
 * QW-07 (roadmap de mejoras): clonar un expediente ya clasificado para
 * proyectos casi idénticos, sin repetir el wizard de nueva instalación
 * desde cero. Ver payloadDuplicado() en lib/expedientes.ts para qué se
 * copia y qué se reinicia a propósito.
 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const duplicado = await duplicarExpediente(params.id, orgId);
    return NextResponse.json(duplicado, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    if (message === "EXPEDIENTE_NO_ENCONTRADO") {
      return NextResponse.json({ error: "Expediente no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
