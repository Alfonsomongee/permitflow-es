"use client";

import { useCallback, useState } from "react";
import type { TramiteEstado, TramitesEstadoMap } from "@/types/plan";
import { hoyIso } from "@/lib/plazos";

interface UseTramitesEstadoReturn {
  estados: TramitesEstadoMap;
  completados: number;
  pendingOrden: number | null;
  error: string | null;
  setEstadoTramite: (orden: number, estado: TramiteEstado) => Promise<void>;
}

export function useTramitesEstado(
  expedienteId: string,
  inicial: TramitesEstadoMap
): UseTramitesEstadoReturn {
  const [estados, setEstados] = useState<TramitesEstadoMap>(inicial ?? {});
  const [pendingOrden, setPendingOrden] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setEstadoTramite = useCallback(
    async (orden: number, estado: TramiteEstado) => {
      if (!expedienteId || pendingOrden !== null) return;

      const previo = estados;
      const clave = String(orden);
      const siguiente: TramitesEstadoMap = { ...previo };

      if (estado === "pendiente") {
        delete siguiente[clave];
      } else {
        siguiente[clave] = {
          estado,
          fecha_inicio: previo[clave]?.fecha_inicio ?? hoyIso(),
          fecha_completado: estado === "completado" ? hoyIso() : null,
        };
      }

      // Optimistic update; rollback si el PATCH falla
      setEstados(siguiente);
      setPendingOrden(orden);
      setError(null);

      try {
        const res = await fetch(`/api/expedientes/${expedienteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tramite: { orden, estado } }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          tramites_estado?: TramitesEstadoMap;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? `Error ${res.status}`);
        }
        // Reconciliar con la verdad del servidor (fechas calculadas allí)
        if (data.tramites_estado) {
          setEstados(data.tramites_estado);
        }
      } catch (err) {
        setEstados(previo);
        setError(
          err instanceof Error ? err.message : "No se pudo guardar el cambio."
        );
      } finally {
        setPendingOrden(null);
      }
    },
    [expedienteId, estados, pendingOrden]
  );

  const completados = Object.values(estados).filter(
    (t) => t.estado === "completado"
  ).length;

  return { estados, completados, pendingOrden, error, setEstadoTramite };
}
