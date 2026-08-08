import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { obtenerExpediente } from "@/lib/expedientes";
import { supabaseAdmin } from "@/lib/supabase";
import { BUCKET_DOCUMENTOS_CLIENTE } from "@/lib/documentos-cliente";

/**
 * apps/web/app/api/expedientes/[id]/documentos-cliente/route.ts
 *
 * Lado del instalador/gestoría: lista los documentos que el propietario
 * final ha subido desde el portal público (/portal/[token]) para este
 * expediente, con una URL de descarga firmada y de corta duración (el
 * bucket es privado, no hay URLs públicas permanentes).
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Scoping: obtenerExpediente ya filtra por organización (evita IDOR).
  const expediente = await obtenerExpediente(params.id, orgId);
  if (!expediente) {
    return NextResponse.json({ error: "Expediente no encontrado" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("documentos_cliente")
    .select("id, tramite_orden, documento_id, documento_label, nombre_original, tamano_bytes, storage_path, subido_en")
    .eq("expediente_id", params.id)
    .order("subido_en", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const documentos = await Promise.all(
    (data ?? []).map(async (doc) => {
      const { data: firmada } = await supabaseAdmin.storage
        .from(BUCKET_DOCUMENTOS_CLIENTE)
        .createSignedUrl(doc.storage_path, 300); // 5 minutos: suficiente para abrir/descargar.

      return {
        id: doc.id,
        tramiteOrden: doc.tramite_orden,
        documentoId: doc.documento_id,
        documentoLabel: doc.documento_label,
        nombreOriginal: doc.nombre_original,
        tamanoBytes: doc.tamano_bytes,
        subidoEn: doc.subido_en,
        url: firmada?.signedUrl ?? null,
      };
    })
  );

  return NextResponse.json({ documentos });
}
