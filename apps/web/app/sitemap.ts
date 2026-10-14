import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_URL ?? "http://localhost:3007";

const RUTAS_PUBLICAS = ["/", "/producto/motor-normativo", "/documentacion", "/contacto", "/aviso-legal", "/privacidad", "/terminos"];

export default function sitemap(): MetadataRoute.Sitemap {
  return RUTAS_PUBLICAS.map((ruta) => ({
    url: `${BASE}${ruta}`,
    changeFrequency: ruta === "/" ? "weekly" : "monthly",
    priority: ruta === "/" ? 1 : 0.6,
  }));
}
