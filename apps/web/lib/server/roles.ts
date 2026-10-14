import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export interface SesionOrg {
  userId: string;
  orgId: string;
}

/**
 * Exige sesión Clerk con organización activa. Devuelve la sesión o la respuesta
 * de error lista para devolver.
 */
export async function requerirSesionOrg(): Promise<SesionOrg | NextResponse> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  return { userId, orgId };
}

/**
 * Además de sesión, exige rol de administrador de la organización. Se usa en
 * acciones con efecto económico o destructivo (facturación, borrado, rotación
 * del enlace del portal). Antes cualquier miembro podía ejecutarlas.
 */
export async function requerirAdminOrg(): Promise<SesionOrg | NextResponse> {
  const { userId, orgId, has } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!has({ role: "org:admin" })) {
    return NextResponse.json(
      { error: "Esta acción solo está disponible para los administradores de la organización." },
      { status: 403 }
    );
  }
  return { userId, orgId };
}

export function esRespuesta(valor: SesionOrg | NextResponse): valor is NextResponse {
  return valor instanceof NextResponse;
}
