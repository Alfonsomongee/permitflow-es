import { clerkClient } from "@clerk/nextjs/server";

/**
 * apps/web/lib/clerk-nombres.ts
 *
 * Extraído de app/api/expedientes/[id]/historial/route.ts (mejoras
 * 2026-08-08) para reutilizarlo también en subsanaciones y cualquier otra
 * ruta que necesite mostrar un nombre legible en vez de un id crudo de
 * Clerk. Una sola llamada batch por request, nunca N+1.
 */

/** Nombre a mostrar para un usuario de Clerk: nombre completo si existe,
 * si no username, si no la parte local del email -- nunca el id crudo si
 * hay alguna alternativa legible. */
export function nombreVisible(user: {
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

/** Resuelve una lista de ids de usuario de Clerk a nombres legibles. Los
 * ids que no se puedan resolver (usuario eliminado, Clerk no disponible)
 * simplemente no aparecen en el resultado -- el llamador decide el
 * fallback (normalmente mostrar el id truncado). */
export async function resolverNombresClerk(ids: string[]): Promise<Record<string, string>> {
  const idsUnicos = Array.from(new Set(ids.filter(Boolean)));
  const nombresPorId: Record<string, string> = {};
  if (idsUnicos.length === 0) return nombresPorId;

  try {
    const client = await clerkClient();
    const { data: usuarios } = await client.users.getUserList({ userId: idsUnicos });
    for (const u of usuarios) {
      const nombre = nombreVisible(u);
      if (nombre) nombresPorId[u.id] = nombre;
    }
  } catch {
    // Si Clerk no responde, degradamos a que el llamador use el id crudo
    // como fallback, en vez de romper la ruta por esto.
  }

  return nombresPorId;
}
