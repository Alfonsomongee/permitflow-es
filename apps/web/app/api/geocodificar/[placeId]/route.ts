import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { comunidadDesdeNombreGoogle } from "@/lib/comunidadDesdeDireccion";

/**
 * apps/web/app/api/geocodificar/[placeId]/route.ts
 *
 * Resuelve un placeId de una sugerencia de autocompletado a su comunidad
 * autónoma (component "administrative_area_level_1"). La resolución de
 * CCAA nunca se aplica sola en el formulario -- el desplegable manual sigue
 * visible y editable, esto solo lo rellena como sugerencia inicial.
 */
export async function GET(
  _req: Request,
  { params }: { params: { placeId: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Autocompletado de direcciones no configurado (falta GOOGLE_MAPS_API_KEY)" },
      { status: 501 }
    );
  }

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(params.placeId)}`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "addressComponents,formattedAddress",
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Error consultando Google Places" }, { status: 502 });
    }

    const data = await res.json();
    const componentes: Array<{ longText: string; types: string[] }> = data.addressComponents ?? [];
    const provincia = componentes.find((c) => c.types.includes("administrative_area_level_1"));

    const comunidad = provincia ? comunidadDesdeNombreGoogle(provincia.longText) : null;

    return NextResponse.json({
      comunidad,
      direccionFormateada: data.formattedAddress ?? null,
      nombreAdministrativo: provincia?.longText ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Error consultando Google Places" }, { status: 502 });
  }
}
