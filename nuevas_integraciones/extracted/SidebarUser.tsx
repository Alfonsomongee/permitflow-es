"use client";

import { UserButton, useUser } from "@clerk/nextjs";

/**
 * Reemplaza el bloque estático de "GreenEnergy SL" del DashboardSidebar.
 * Muestra el avatar de Clerk + nombre + email del usuario autenticado.
 * Pégalo en la parte inferior del DashboardSidebar en lugar del bloque hardcoded.
 */
export function SidebarUser() {
  const { user } = useUser();

  if (!user) return null;

  const displayName =
    user.fullName ??
    user.username ??
    user.primaryEmailAddress?.emailAddress ??
    "Usuario";

  const email = user.primaryEmailAddress?.emailAddress ?? "";

  return (
    <div className="flex items-center gap-2.5 rounded-lg px-3 py-2.5">
      <UserButton
        appearance={{
          elements: {
            avatarBox: "h-7 w-7",
          },
        }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-text-primary">
          {displayName}
        </p>
        <p className="truncate text-[11px] text-text-secondary">{email}</p>
      </div>
    </div>
  );
}
