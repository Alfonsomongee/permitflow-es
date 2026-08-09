"use client";

import { useState } from "react";
import { OrganizationProfile, UserProfile } from "@clerk/nextjs";
import { Building2, Loader2, Users, UserCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { clerkTheme } from "@/lib/clerk-theme";

const PLAN_LABEL: Record<string, string> = {
  free: "Gratuito",
  pro: "Pro",
  enterprise: "Enterprise",
};

export interface OrgInfo {
  nombre: string;
  plan: string;
  suscripcionActiva: boolean;
  suscripcionFin: string | null;
  tieneClienteStripe: boolean;
}

export function AjustesTabs({ orgInfo }: { orgInfo: OrgInfo }) {
  const [gestionandoFacturacion, setGestionandoFacturacion] = useState(false);
  const [errorFacturacion, setErrorFacturacion] = useState<string | null>(null);

  const gestionarFacturacion = async () => {
    setErrorFacturacion(null);
    setGestionandoFacturacion(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "No se pudo abrir la gestión de facturación.");
      }
      window.location.href = data.url;
    } catch (err) {
      setErrorFacturacion(err instanceof Error ? err.message : "No se pudo abrir la gestión de facturación.");
      setGestionandoFacturacion(false);
    }
  };

  return (
    <Tabs defaultValue="organizacion">
      <TabsList variant="line" className="mb-6">
        <TabsTrigger value="organizacion">
          <Building2 size={14} aria-hidden />
          Organización
        </TabsTrigger>
        <TabsTrigger value="equipo">
          <Users size={14} aria-hidden />
          Equipo
        </TabsTrigger>
        <TabsTrigger value="cuenta">
          <UserCircle size={14} aria-hidden />
          Mi cuenta
        </TabsTrigger>
      </TabsList>

      <TabsContent value="organizacion">
        <div className="max-w-lg rounded-xl border border-border bg-surface p-6">
          <h2 className="text-sm font-medium text-text-primary">Suscripción</h2>
          <dl className="mt-4 flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-text-secondary">Organización</dt>
              <dd className="font-medium text-text-primary">{orgInfo.nombre}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-text-secondary">Plan actual</dt>
              <dd className="font-medium text-text-primary">
                {PLAN_LABEL[orgInfo.plan] ?? orgInfo.plan}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-text-secondary">Estado</dt>
              <dd
                className={`font-medium ${orgInfo.suscripcionActiva ? "text-success" : "text-text-secondary"}`}
              >
                {orgInfo.suscripcionActiva ? "Activa" : "Sin suscripción activa"}
              </dd>
            </div>
            {orgInfo.suscripcionFin && (
              <div className="flex items-center justify-between">
                <dt className="text-text-secondary">Renueva / finaliza</dt>
                <dd className="font-medium text-text-primary">
                  {new Date(orgInfo.suscripcionFin).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-6 border-t border-border pt-4">
            {orgInfo.tieneClienteStripe ? (
              <>
                <button
                  onClick={gestionarFacturacion}
                  disabled={gestionandoFacturacion}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {gestionandoFacturacion && <Loader2 size={14} className="animate-spin" />}
                  Gestionar facturación
                </button>
                <p className="mt-2 text-xs text-text-secondary">
                  Cambia de plan, actualiza tu tarjeta o descarga facturas desde el portal seguro de Stripe.
                </p>
              </>
            ) : (
              <>
                <a
                  href="/#precios"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  Ver planes
                </a>
                <p className="mt-2 text-xs text-text-secondary">
                  Tu organización todavía no tiene una suscripción de pago.
                </p>
              </>
            )}
            {errorFacturacion && (
              <p className="mt-2 text-xs text-danger">{errorFacturacion}</p>
            )}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="equipo">
        <OrganizationProfile routing="hash" appearance={clerkTheme} />
      </TabsContent>

      <TabsContent value="cuenta">
        <UserProfile routing="hash" appearance={clerkTheme} />
      </TabsContent>
    </Tabs>
  );
}
