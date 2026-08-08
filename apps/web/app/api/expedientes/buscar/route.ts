import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { listarExpedientes } from "@/lib/expedientes";

/**
 * apps/web/app/api/expedientes/buscar/route.ts
 *
 * Endpoint ligero para el Command Palette (Cmd+K): devuelve solo los campos
 * necesarios para listar/filtrar expedientes en el cliente, sin el
 * plan_tramitacion completo (que puede ser pesado). Mismo scoping por
 * organización que el resto de rutas de expedientes.
 */
export async function GET() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const expedientes = await listarExpedientes(orgId);

  const resultados = expedientes.slice(0, 50).map((e) => ({
    id: e.id,
    cliente: e.referencia_cliente,
    comunidad: e.comunidad,
    tipo_instalacion: e.tipo_instalacion,
    estado: e.estado,
  }));

  return NextResponse.json({ expedientes: resultados });
}
