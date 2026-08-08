import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * apps/web/app/api/geocodificar/route.ts
 *
 * Proxy server-side a la Places API (New) de Google para el autocompletado
 * de direcciones del paso 1 de "Nueva instalación". Server-side (no
 * NEXT_PUBLIC_) a propósito: evita exponer la key en el bundle del cliente
 * y nos permite restringirla por API en Google Cloud sin depender del
 * referrer del navegador.
 *
 * GET /api/geocodificar?q=texto -> [{ placeId, texto }]
 */
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 3) {
    return NextResponse.json({ sugerencias: [] });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Autocompletado de direcciones no configurado (falta GOOGLE_MAPS_API_KEY)" },
      { status: 501 }
    );
  }

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify({
        input: q,
        includedRegionCodes: ["es"],
        languageCode: "es",
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Error consultando Google Places" }, { status: 502 });
    }

    const data = await res.json();
    const sugerencias = (data.suggestions ?? [])
      .filter((s: any) => s.placePrediction)
      .map((s: any) => ({
        placeId: s.placePrediction.placeId as string,
        texto: s.placePrediction.text?.text as string,
      }));

    return NextResponse.json({ sugerencias });
  } catch {
    return NextResponse.json({ error: "Error consultando Google Places" }, { status: 502 });
  }
}
