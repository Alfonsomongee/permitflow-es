"use client";

import { useEffect, useState } from "react";

/**
 * Suscripción a una media query. Devuelve `true` en el servidor y en el primer
 * render del cliente (escritorio por defecto) para que SSR e hidratación
 * coincidan; se corrige tras montar.
 */
export function useMediaQuery(consulta: string): boolean {
  const [coincide, setCoincide] = useState(true);

  useEffect(() => {
    const mql = window.matchMedia(consulta);
    const actualizar = () => setCoincide(mql.matches);
    actualizar();
    mql.addEventListener("change", actualizar);
    return () => mql.removeEventListener("change", actualizar);
  }, [consulta]);

  return coincide;
}
