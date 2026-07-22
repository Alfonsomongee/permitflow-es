import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  aplicarPatchExpediente,
  type PatchExpedienteInput,
} from "@/lib/expedientes";

const ESTADOS_TRAMITE = new Set(["pendiente", "en_curso", "completado"]);

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: PatchExpedienteInput;
  try {
    body = (await req.json()) as PatchExpedienteInput;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (
    body.tramite &&
    (!Number.isInteger(body.tramite.orden) ||
      !ESTADOS_TRAMITE.has(body.tramite.estado))
  ) {
    return NextResponse.json(
      { error: "Trámite inválido: revisa orden y estado." },
      { status: 400 }
    );
  }

  if (
    !body.tramite &&
    body.referencia_cliente === undefined &&
    body.notas === undefined
  ) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  try {
    const resultado = await aplicarPatchExpediente(params.id, orgId, body);
    return NextResponse.json(resultado);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    if (message === "EXPEDIENTE_NO_ENCONTRADO") {
      return NextResponse.json(
        { error: "Expediente no encontrado" },
        { status: 404 }
      );
    }
    if (message === "ORDEN_INVALIDO") {
      return NextResponse.json(
        { error: "El trámite indicado no existe en el plan" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
