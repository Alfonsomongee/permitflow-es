import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_URL ?? "http://localhost:3007";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Áreas privadas y credenciales en la URL: fuera de los buscadores.
        disallow: ["/api/", "/portal/", "/expedientes", "/nueva-instalacion", "/ajustes", "/alertas", "/estadisticas", "/simulador", "/plantillas", "/orientacion"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
