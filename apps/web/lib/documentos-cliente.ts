/**
 * apps/web/lib/documentos-cliente.ts
 *
 * Constantes y helpers compartidos entre la ruta pública de subida
 * (app/api/portal/[token]/documentos) y la ruta autenticada de descarga
 * (app/api/expedientes/[id]/documentos-cliente). Deliberadamente separado
 * de lib/expedientes.ts: este archivo no toca Supabase, solo valida/deriva.
 */
import type { PlanTramitacion } from "@/types/plan";

export const BUCKET_DOCUMENTOS_CLIENTE = "documentos-cliente";

export const MAX_TAMANO_BYTES = 15 * 1024 * 1024; // 15MB, igual que el límite del bucket.

export const MIME_PERMITIDOS = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

/** Límite defensivo contra abuso de un token filtrado/adivinado: sin rate
 * limiting por IP disponible en el runtime de Next.js (no hay Redis
 * conectado aquí, a diferencia de apps/api), se limita el volumen total por
 * expediente en una ventana de 24h. */
export const MAX_SUBIDAS_POR_DIA = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function esTokenValido(token: string): boolean {
  return UUID_RE.test(token);
}

/** Quita separadores de ruta y caracteres raros del nombre original antes de
 * usarlo en la storage_path o en Content-Disposition. No garantiza
 * unicidad -- eso lo da el prefijo aleatorio que antepone la ruta. */
export function sanearNombreArchivo(nombre: string): string {
  const base = nombre.replace(/[/\\]/g, "_").replace(/[^\w.\-áéíóúÁÉÍÓÚñÑ ]/g, "");
  return base.slice(-150) || "archivo";
}

export interface TramiteDocumentoRef {
  tramiteOrden: number;
  tramiteNombre: string;
  documentoId: string;
  documentoLabel: string;
}

/** Busca un (tramite_orden, documento_id) dentro del plan real del
 * expediente. Devuelve null si no existe o si el trámite no es accionable
 * por el propietario final (p.ej. trámites de oficio de la administración)
 * -- evita que alguien con el token suba archivos "colgados" de un
 * documento que ni siquiera se le muestra en el portal. */
export function resolverDocumentoDelPlan(
  plan: PlanTramitacion | null,
  tramiteOrden: number,
  documentoId: string
): TramiteDocumentoRef | null {
  const tramite = plan?.tramites?.find((t) => t.orden === tramiteOrden);
  if (!tramite) return null;

  const accionable = tramite.tipo_actuacion === "accion_usuario" || tramite.tipo_actuacion === undefined;
  if (!accionable) return null;

  const doc = tramite.documentos_requeridos.find((d) => d.id === documentoId);
  if (!doc) return null;

  return {
    tramiteOrden: tramite.orden,
    tramiteNombre: tramite.nombre,
    documentoId: doc.id,
    documentoLabel: doc.label,
  };
}
