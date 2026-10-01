import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Autoriza una invocación de cron de Vercel (`Authorization: Bearer $CRON_SECRET`).
 *
 * Falla CERRADO: antes se comparaba con `Bearer ${process.env.CRON_SECRET}`, que
 * si la variable no existe vale literalmente "Bearer undefined" -- y cualquiera
 * que enviara esa cabecera podía ejecutar los jobs (las rutas /api/cron son
 * públicas en middleware.ts).
 *
 * Devuelve null si está autorizado, o la respuesta de error que hay que devolver.
 */
export function verificarCron(req: Request): NextResponse | null {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) {
    console.error("[cron] CRON_SECRET no configurado: se rechaza la invocación.");
    return NextResponse.json({ error: "Cron no configurado" }, { status: 503 });
  }
  const recibido = req.headers.get("authorization") ?? "";
  const esperado = `Bearer ${secreto}`;
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return null;
}
