/**
 * apps/web/lib/server/api.ts
 *
 * Configuración y cabeceras comunes para llamar a FastAPI desde las rutas de
 * Next.js (solo servidor). Antes cada ruta repetía `const API_URL = …` y
 * `INTERNAL_API_KEY ?? ""` (15 copias), y ninguna reenviaba la IP del visitante:
 * FastAPI veía siempre la IP de salida de Vercel, de modo que el rate limit de
 * contacto/newsletter/simulador era una cuota compartida por todo el sitio.
 */

export const API_URL = (
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000"
).replace(/\/+$/, "");

if (process.env.NODE_ENV === "production" && !process.env.API_URL && !process.env.NEXT_PUBLIC_API_URL) {
  console.error("[api] API_URL no está configurada: las llamadas a FastAPI apuntan a localhost.");
}

/** IP del visitante según los proxies de confianza de Vercel, o undefined. */
export function ipCliente(req: Request): string | undefined {
  const forwarded = req.headers.get("x-forwarded-for");
  const primera = forwarded?.split(",")[0]?.trim();
  return primera || req.headers.get("x-real-ip")?.trim() || undefined;
}

/**
 * Cabeceras para FastAPI: clave interna + IP real del visitante (que FastAPI
 * solo acepta porque la petición ya lleva la clave interna válida).
 */
export function cabecerasInternas(
  req?: Request,
  extra: Record<string, string> = {}
): Record<string, string> {
  const cabeceras: Record<string, string> = {
    "X-Internal-Key": process.env.INTERNAL_API_KEY ?? "",
    ...extra,
  };
  const ip = req ? ipCliente(req) : undefined;
  if (ip) cabeceras["X-Client-IP"] = ip;
  return cabeceras;
}
