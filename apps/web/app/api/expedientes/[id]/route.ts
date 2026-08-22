import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  aplicarPatchExpediente,
  eliminarExpediente,
  obtenerExpediente,
  type PatchExpedienteInput,
} from "@/lib/expedientes";
import { esFaseComercial } from "@/lib/faseComercial";

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

  if (body.fase_comercial !== undefined && !esFaseComercial(body.fase_comercial)) {
    return NextResponse.json({ error: "Fase comercial inválida" }, { status: 400 });
  }

  if (
    !body.tramite &&
    body.referencia_cliente === undefined &&
    body.notas === undefined &&
    body.fase_comercial === undefined
  ) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  try {
    const resultado = await aplicarPatchExpediente(params.id, orgId, userId, body);
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
    if (message === "CONFLICTO_VERSION") {
      return NextResponse.json(
        {
          error: "Otro usuario ha modificado este expediente. Recarga la página para ver los cambios.",
          conflicto: true,
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// eliminarExpediente() en lib/expedientes.ts existía desde hace tiempo pero
// no tenía ninguna ruta que la llamara: la única forma de borrar un
// expediente era directamente en Supabase. Acción destructiva e
// irreversible (no hay papelera ni soft-delete todavía), así que la
// confirmación vive en el cliente (EliminarExpedienteButton, confirmación en
// dos pasos) antes de llegar aquí (plan de acción consolidado 2026-08-12,
// P-19).
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const expediente = await obtenerExpediente(params.id, orgId);
    if (!expediente) {
      return NextResponse.json(
        { error: "Expediente no encontrado" },
        { status: 404 }
      );
    }

    await eliminarExpediente(params.id, orgId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
