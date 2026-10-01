import { NextResponse } from "next/server";
import { obtenerOCrearShareToken } from "@/lib/expedientes";
import { esRespuesta, requerirAdminOrg, requerirSesionOrg } from "@/lib/server/roles";

/**
 * Genera (o devuelve) el enlace del portal de cliente de solo lectura para
 * este expediente. POST con { regenerar: true } rota el token, invalidando
 * cualquier enlace ya compartido antes.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const params = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { regenerar?: boolean };

  // Ver/crear el enlace: cualquier miembro. Rotarlo (invalida el enlace ya
  // compartido con el cliente final): solo administradores.
  const sesion = body.regenerar === true ? await requerirAdminOrg() : await requerirSesionOrg();
  if (esRespuesta(sesion)) return sesion;
  const { orgId } = sesion;

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
