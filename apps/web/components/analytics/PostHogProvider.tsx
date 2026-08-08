"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useOrganization, useUser } from "@clerk/nextjs";
import {
  capturar,
  identificarOrganizacion,
  identificarUsuario,
  initPostHog,
  resetearIdentidad,
} from "@/lib/analytics/posthog";

/**
 * apps/web/components/analytics/PostHogProvider.tsx
 *
 * Envuelve toda la app (app/layout.tsx) para: inicializar PostHog una vez,
 * capturar $pageview en cada navegación (el App Router no dispara un load
 * de página completo, así que no hay pageview automático como en un sitio
 * tradicional) e identificar usuario/organización vía Clerk cuando hay
 * sesión. Mejoras 2026-08-07 -- antes no existía ningún código de
 * analítica pese a tener las variables de entorno de PostHog definidas.
 */

function PostHogPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const query = searchParams?.toString();
    capturar("$pageview", {
      $current_url: query ? `${pathname}?${query}` : pathname,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  return null;
}

function PostHogIdentify() {
  const { user, isSignedIn } = useUser();
  const { organization } = useOrganization();

  useEffect(() => {
    if (isSignedIn && user) {
      // Solo el id de Clerk: sin email ni nombre, para minimizar datos
      // personales en el proveedor de analítica.
      identificarUsuario(user.id);
    } else if (isSignedIn === false) {
      resetearIdentidad();
    }
  }, [isSignedIn, user]);

  useEffect(() => {
    if (organization) {
      identificarOrganizacion(organization.id, { name: organization.name });
    }
  }, [organization]);

  return null;
}

export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageview />
      </Suspense>
      <PostHogIdentify />
      {children}
    </>
  );
}
