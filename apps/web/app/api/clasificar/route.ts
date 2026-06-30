/**
 * apps/web/app/api/clasificar/route.ts
 *
 * Proxy autenticado entre el frontend y el motor FastAPI.
 * - Valida sesión Clerk
 * - Llama a FastAPI /api/v1/clasificador
 * - Guarda el expediente en Supabase
 * - Devuelve { expedienteId, plan }
 */
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { crearExpediente } from "@/lib/expedientes";
import type { FormState } from "@/components/nueva-instalacion/types";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

export async function POST(req: Request) {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const formState: FormState = await req.json();

  // ── 1. Llamar al motor normativo FastAPI ──────────────────────────────────
  const motorRes = await fetch(`${API_URL}/api/v1/clasificador`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tipo_instalacion: formState.tipo_instalacion,
      comunidad: formState.comunidad,
      municipio: formState.municipio,
      potencia_kw: parseFloat(formState.potencia_kw) || 0,
      uso: formState.uso,
      numero_puntos: formState.numero_puntos
        ? parseInt(formState.numero_puntos)
        : undefined,
      potencia_por_punto_kw: formState.potencia_por_punto_kw
        ? parseFloat(formState.potencia_por_punto_kw)
        : undefined,
      modo_recarga: formState.modo_recarga || undefined,
      acceso_publico: formState.acceso_publico,
      ubicacion_irve: formState.ubicacion_irve || undefined,
      requiere_nuevo_suministro: formState.requiere_nuevo_suministro,
      combustible: formState.combustible || undefined,
      presion_bar: formState.presion_bar || undefined,
      solicita_ayuda: formState.solicita_ayuda,
    }),
  });

  if (!motorRes.ok) {
    const detail = await motorRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: detail?.detail ?? "Error en el motor normativo" },
      { status: motorRes.status }
    );
  }

  const plan = await motorRes.json();

  // ── 2. Guardar expediente en Supabase ─────────────────────────────────────
  const expediente = await crearExpediente({
    clerkOrgId: orgId,
    clerkUserId: userId,
    formState,
    plan,
  });

  return NextResponse.json({ expedienteId: expediente.id, plan });
}
