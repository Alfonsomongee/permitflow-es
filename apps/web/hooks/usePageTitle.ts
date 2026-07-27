import { usePathname } from "next/navigation";
import { useMemo } from "react";

const PAGE_TITLES: Record<string, string> = {
  "/expedientes":       "Expedientes",
  "/nueva-instalacion": "Nueva instalación",
  "/plantillas":        "Plantillas",
  "/alertas":           "Alertas BOE",
  "/estadisticas":      "Estadísticas",
  "/ajustes":           "Ajustes",
  "/simulador":         "Simulador AI",
  "/orientacion":       "Orientación Tecnológica",
};

export function usePageTitle() {
  const pathname = usePathname();

  const title = useMemo(() => {
    // 1. Check for exact match or specific prefixes
    if (pathname.startsWith("/expedientes/")) {
      const id = pathname.split("/").pop();
      return `Expediente ${id?.slice(0, 8)}...`;
    }
    
    if (pathname.startsWith("/orientacion/")) {
      return "Detalle de Orientación";
    }

    // 2. Find the most specific match
    const match = Object.entries(PAGE_TITLES)
      .sort((a, b) => b[0].length - a[0].length)
      .find(([key]) => pathname.startsWith(key));

    return match ? match[1] : "PermitFlow ES";
  }, [pathname]);

  return title;
}
