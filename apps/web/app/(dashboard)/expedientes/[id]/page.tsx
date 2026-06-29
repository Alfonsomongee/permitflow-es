/**
 * apps/web/app/(dashboard)/expedientes/[id]/page.tsx
 *
 * Ruta: /expedientes/[id]
 * Recibe el id del expediente y muestra su plan de tramitación.
 *
 * Alternativa sin base de datos (para prototipo/TFG):
 * Los parámetros viajan por sessionStorage desde nueva-instalacion/page.tsx
 * y se recuperan en el cliente. Ver comentario al final del archivo.
 */

import { notFound } from "next/navigation";
import { PlanTramitacionView } from "@/components/plan-tramitacion";
import { type PlanTramitacion, type InstalacionParams } from "@/types/plan";

// ─── Helpers ────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchPlan(params: InstalacionParams): Promise<PlanTramitacion> {
  const res = await fetch(`${API_URL}/api/v1/clasificador`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    // En desarrollo deshabilita caché para ver siempre datos frescos
    cache: process.env.NODE_ENV === "development" ? "no-store" : "force-cache",
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail?.detail ?? `Error ${res.status} al llamar al clasificador`);
  }

  return res.json();
}

// ─── Page ───────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: {
    tipo_instalacion?: string;
    comunidad?: string;
    municipio?: string;
    potencia_kw?: string;
    uso?: string;
    numero_puntos?: string;
    modo_recarga?: string;
    acceso_publico?: string;
    ubicacion_irve?: string;
    solicita_ayuda?: string;
  };
}

export default async function PlanPage({ searchParams }: PageProps) {
  const {
    tipo_instalacion,
    comunidad,
    municipio,
    potencia_kw,
    uso,
    numero_puntos,
    modo_recarga,
    acceso_publico,
    ubicacion_irve,
    solicita_ayuda,
  } = searchParams;

  // Validación mínima de parámetros obligatorios
  if (!tipo_instalacion || !comunidad || !potencia_kw) {
    notFound();
  }

  const instalacionParams: InstalacionParams = {
    tipo_instalacion,
    comunidad,
    municipio: municipio ?? "",
    potencia_kw: parseFloat(potencia_kw),
    uso: uso ?? "residencial",
    numero_puntos: numero_puntos ? parseInt(numero_puntos) : undefined,
    modo_recarga: modo_recarga ?? undefined,
    acceso_publico: acceso_publico === "true",
    ubicacion_irve: ubicacion_irve ?? undefined,
    solicita_ayuda: solicita_ayuda === "true",
  };

  let plan: PlanTramitacion;
  try {
    plan = await fetchPlan(instalacionParams);
  } catch (e) {
    // En producción considera usar error.tsx en su lugar
    throw e;
  }

  return <PlanTramitacionView plan={plan} params={instalacionParams} />;
}

/*
 * ─── Alternativa cliente (sin searchParams) ───────────────────────────────
 *
 * Si prefieres guardar el estado del formulario en sessionStorage en lugar de
 * pasarlo por URL (útil para el prototipo sin autenticación):
 *
 * En nueva-instalacion/page.tsx, al hacer submit:
 *   sessionStorage.setItem("pf_params", JSON.stringify(formData));
 *   router.push("/expedientes/nuevo");
 *
 * Y en esta página, crea una versión "use client" que recupere los datos:
 *   const raw = sessionStorage.getItem("pf_params");
 *   const params = raw ? JSON.parse(raw) : null;
 *
 * Luego llama a la API con fetch() desde el cliente.
 * ──────────────────────────────────────────────────────────────────────────
 */
