import { clerkClient } from "@clerk/nextjs/server";

/**
 * apps/web/lib/clerk-org-emails.ts
 *
 * Resuelve los emails de los miembros de una organización de Clerk, para el
 * digest semanal del radar normativo (QW-02, roadmap de mejoras). No existe
 * ninguna columna "email de notificaciones" en `organizaciones` -- se envía
 * a todos los miembros de la organización, igual que ya se resuelven
 * nombres visibles en lib/clerk-nombres.ts.
 *
 * Mismo criterio defensivo que resolverNombresClerk: si Clerk no responde,
 * se degrada a una lista vacía en vez de romper el cron para el resto de
 * organizaciones.
 */
export async function emailsDeOrganizacion(clerkOrgId: string): Promise<string[]> {
  try {
    const client = await clerkClient();
    const { data: miembros } = await client.organizations.getOrganizationMembershipList({
      organizationId: clerkOrgId,
      limit: 100,
    });
    const emails = miembros
      .map((m) => m.publicUserData?.identifier)
      .filter((email): email is string => !!email);
    return Array.from(new Set(emails));
  } catch {
    return [];
  }
}
