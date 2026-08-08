import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { obtenerExpediente } from "@/lib/expedientes";
import { supabaseAdmin } from "@/lib/supabase";

/** Nombre a mostrar para un usuario de Clerk: nombre completo si existe,
 * si no username, si no la parte local del email -- nunca el id crudo si
 * hay alguna alternativa legible. */
function nombreVisible(user: {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  emailAddresses: { emailAddress: string }[];
}): string | null {
  const nombreCompleto = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (nombreCompleto) return nombreCompleto;
  if (user.username) return user.username;
  const email = user.emailAddresses[0]?.emailAddress;
  if (email) return email.split("@")[0];
  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Scoping por organización: mismo patrón anti-IDOR que el resto de rutas.
  const expediente = await obtenerExpediente(params.id, orgId);
  if (!expediente) {
    return NextResponse.json({ error: "Expediente no encontrado" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("historial_tramites")
    .select("id, orden, estado_anterior, estado_nuevo, operador_id, creado_en")
    .eq("expediente_id", params.id)
    .order("creado_en", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const historial = data ?? [];

  // Resolver operador_id (Clerk user id crudo) a un nombre legible -- antes
  // el panel de actividad mostraba "operador …a1b2c3" para cualquiera que no
  // fuera el propio usuario (mejoras 2026-08-07). Una sola llamada batch,
  // no una por entrada.
  const idsUnicos = Array.from(new Set(historial.map((h) => h.operador_id).filter(Boolean)));
  const nombresPorId: Record<string, string> = {};

  if (idsUnicos.length > 0) {
    try {
      const client = await clerkClient();
      const { data: usuarios } = await client.users.getUserList({ userId: idsUnicos });
      for (const u of usuarios) {
        const nombre = nombreVisible(u);
        if (nombre) nombresPorId[u.id] = nombre;
      }
    } catch {
      // Si Clerk no responde, degradamos al id crudo (ver fallback en el
      // frontend) en vez de romper el panel de historial por esto.
    }
  }

  const historialConNombre = historial.map((h) => ({
    ...h,
    operador_nombre: nombresPorId[h.operador_id] ?? null,
  }));

  return NextResponse.json({ historial: historialConNombre, usuario_actual: userId });
}
