/**
 * apps/web/lib/comunidadDesdeDireccion.ts
 *
 * Normaliza el nombre de "administrative_area_level_1" que devuelve la
 * Places API (New) de Google a nuestro slug interno de comunidad autónoma
 * (mismo vocabulario que components/dashboard/types.ts). Google puede
 * devolver variantes de nombre ("Comunidad de Madrid", "Región de Murcia",
 * "País Vasco/Euskadi"...), así que se compara por inclusión de texto
 * normalizado (sin acentos/mayúsculas) en vez de igualdad exacta.
 */

const PATRONES: { slug: string; contiene: string[] }[] = [
  { slug: "andalucia", contiene: ["andalucia"] },
  { slug: "aragon", contiene: ["aragon"] },
  { slug: "asturias", contiene: ["asturias"] },
  { slug: "baleares", contiene: ["baleares", "illes balears"] },
  { slug: "canarias", contiene: ["canarias"] },
  { slug: "cantabria", contiene: ["cantabria"] },
  { slug: "castilla_la_mancha", contiene: ["castilla-la mancha", "castilla la mancha"] },
  { slug: "castilla_leon", contiene: ["castilla y leon"] },
  { slug: "cataluna", contiene: ["cataluna", "catalunya"] },
  { slug: "comunidad_valenciana", contiene: ["comunidad valenciana", "comunitat valenciana", "pais valenciano"] },
  { slug: "extremadura", contiene: ["extremadura"] },
  { slug: "galicia", contiene: ["galicia"] },
  { slug: "la_rioja", contiene: ["rioja"] },
  { slug: "madrid", contiene: ["madrid"] },
  { slug: "murcia", contiene: ["murcia"] },
  { slug: "navarra", contiene: ["navarra"] },
  { slug: "pais_vasco", contiene: ["pais vasco", "euskadi"] },
];

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function comunidadDesdeNombreGoogle(nombreAdministrativo: string): string | null {
  const normalizado = normalizar(nombreAdministrativo);
  for (const { slug, contiene } of PATRONES) {
    if (contiene.some((fragmento) => normalizado.includes(fragmento))) {
      return slug;
    }
  }
  return null;
}
