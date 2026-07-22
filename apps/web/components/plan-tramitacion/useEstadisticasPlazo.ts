"use client";

import { useEffect, useState } from "react";
import type { EstadisticaPlazo } from "@/types/plan";

export function useEstadisticasPlazo(
  expedienteId: string | undefined
): Record<string, EstadisticaPlazo> {
  const [estadisticas, setEstadisticas] = useState<Record<string, EstadisticaPlazo>>({});

  useEffect(() => {
    if (!expedienteId) return;
    let cancelado = false;

    fetch(`/api/expedientes/${expedienteId}/estadisticas`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => {
        if (!cancelado) setEstadisticas(data as Record<string, EstadisticaPlazo>);
      })
      .catch(() => {
        if (!cancelado) setEstadisticas({});
      });

    return () => {
      cancelado = true;
    };
  }, [expedienteId]);

  return estadisticas;
}
