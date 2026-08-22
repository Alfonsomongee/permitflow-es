import { randomUUID } from "node:crypto";
import { supabaseAdmin, type DbExpediente } from "./supabase";
import type { FormState } from "@/components/nueva-instalacion/types";
import type {
  PlanTramitacion,
  TramiteEstado,
  TramitesEstadoMap,
} from "@/types/plan";
import { hoyIso } from "./plazos";

function fallbackOrgName(clerkOrgId: string): string {
  return `Organizacion ${clerkOrgId.slice(-6)}`;
}

async function ensureOrgId(clerkOrgId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("organizaciones")
    .select("id")
    .eq("clerk_org_id", clerkOrgId)
    .maybeSingle();

  if (data?.id) return data.id;

  if (error) {
    throw new Error(`Error consultando organizacion: ${error.message}`);
  }

  const { data: created, error: createError } = await supabaseAdmin
    .from("organizaciones")
    .insert({
      clerk_org_id: clerkOrgId,
      nombre: fallbackOrgName(clerkOrgId),
    })
    .select("id")
    .single();

  if (createError || !created?.id) {
    throw new Error(
      `Error creando organizacion para Clerk (${clerkOrgId}): ${
        createError?.message ?? "sin detalle"
      }`
    );
  }

  return created.id;
}

export async function crearExpediente({
  clerkOrgId,
  clerkUserId,
  formState,
  plan,
}: {
  clerkOrgId: string;
  clerkUserId: string;
  formState: FormState;
  plan: PlanTramitacion;
}): Promise<DbExpediente> {
  const orgId = await ensureOrgId(clerkOrgId);

  const { data, error } = await supabaseAdmin
    .from("expedientes")
    .insert({
      org_id: orgId,
      clerk_user_id: clerkUserId,
      tipo_instalacion: formState.tipo_instalacion,
      comunidad: formState.comunidad,
      potencia_kw: parseFloat(formState.potencia_kw) || 0,
      uso: formState.uso,
      numero_puntos: formState.numero_puntos
        ? parseInt(formState.numero_puntos, 10)
        : null,
      modo_recarga: formState.modo_recarga || null,
      acceso_publico: formState.acceso_publico,
      ubicacion_irve: formState.ubicacion_irve || null,
      requiere_nuevo_suministro: formState.requiere_nuevo_suministro,
      combustible: formState.combustible || null,
      presion_bar: formState.presion_bar || null,
      solicita_ayuda: formState.solicita_ayuda,
      plan_tramitacion: plan,
      tiempo_total_dias: plan.tiempo_total_estimado_dias,
      estado: "pendiente",
      tramites_completados: 0,
    })
    .select()
    .single();

  if (error) throw new Error(`Error creando expediente: ${error.message}`);
  return data;
}

/**
 * Payload de inserción para clonar un expediente. Pura y separada de
 * duplicarExpediente() (que hace el round-trip real a Supabase) para poder
 * testearla sin red -- origen: roadmap de mejoras, QW-07.
 *
 * Copia el plan de tramitación ya calculado (no lo re-clasifica): una
 * instaladora que hace proyectos casi idénticos (mismo modelo de panel,
 * misma CCAA, misma potencia) quiere el MISMO plan verificado, no una
 * reclasificación que podría variar sutilmente si la normativa cambió entre
 * medias. La contrapartida -- si la normativa SÍ cambió, el duplicado
 * hereda un plan potencialmente desactualizado -- es aceptable porque el
 * caso de uso es duplicar en el mismo lote de trabajo, no meses después
 * (para eso ya existe crear un expediente nuevo desde cero).
 *
 * referencia_cliente, municipio y notas se vacían a propósito: son datos
 * del proyecto original que no deben arrastrarse en silencio a uno nuevo
 * (el ejemplo real es literalmente "cambiar dirección y cliente"). El
 * progreso (tramites_estado/tramites_completados/estado) también se
 * reinicia: es un expediente nuevo, no ha empezado a tramitarse.
 */
export function payloadDuplicado(
  original: DbExpediente
): Omit<
  DbExpediente,
  "id" | "org_id" | "version" | "share_token" | "creado_en" | "actualizado_en"
> {
  return {
    clerk_user_id: original.clerk_user_id,
    tipo_instalacion: original.tipo_instalacion,
    comunidad: original.comunidad,
    potencia_kw: original.potencia_kw,
    uso: original.uso,
    numero_puntos: original.numero_puntos,
    modo_recarga: original.modo_recarga,
    acceso_publico: original.acceso_publico,
    ubicacion_irve: original.ubicacion_irve,
    requiere_nuevo_suministro: original.requiere_nuevo_suministro,
    combustible: original.combustible,
    presion_bar: original.presion_bar,
    solicita_ayuda: original.solicita_ayuda,
    plan_tramitacion: original.plan_tramitacion,
    tiempo_total_dias: original.tiempo_total_dias,
    estado: "borrador",
    tramites_completados: 0,
    tramites_estado: {},
    referencia_cliente: null,
    notas: null,
  };
}

export async function duplicarExpediente(
  id: string,
  clerkOrgId: string
): Promise<DbExpediente> {
  const orgId = await ensureOrgId(clerkOrgId);

  const original = await obtenerExpediente(id, clerkOrgId);
  if (!original) throw new Error("EXPEDIENTE_NO_ENCONTRADO");

  const { data, error } = await supabaseAdmin
    .from("expedientes")
    .insert({ ...payloadDuplicado(original), org_id: orgId })
    .select()
    .single();

  if (error) throw new Error(`Error duplicando expediente: ${error.message}`);
  return data;
}

export async function listarExpedientes(clerkOrgId: string): Promise<DbExpediente[]> {
  const orgId = await ensureOrgId(clerkOrgId);

  const { data, error } = await supabaseAdmin
    .from("expedientes")
    .select("*")
    .eq("org_id", orgId)
    .order("actualizado_en", { ascending: false });

  if (error) throw new Error(`Error listando expedientes: ${error.message}`);
  return data ?? [];
}

export async function obtenerExpediente(
  id: string,
  clerkOrgId: string
): Promise<DbExpediente | null> {
  const orgId = await ensureOrgId(clerkOrgId);

  const { data, error } = await supabaseAdmin
    .from("expedientes")
    .select("*")
    .eq("id", id)
    .eq("org_id", orgId)
    .single();

  if (error) return null;
  return data;
}

export async function eliminarExpediente(
  id: string,
  clerkOrgId: string
): Promise<void> {
  const orgId = await ensureOrgId(clerkOrgId);

  const { error } = await supabaseAdmin
    .from("expedientes")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId);

  if (error) throw new Error(`Error eliminando expediente: ${error.message}`);
}

export interface PatchExpedienteInput {
  tramite?: { orden: number; estado: TramiteEstado };
  referencia_cliente?: string | null;
  notas?: string | null;
  /** Versión que el cliente leyó antes de mutar. Requerida en la práctica
   * para cambios de trámite: sin ella no hay protección frente a lost update. */
  version?: number;
}

export interface PatchExpedienteResult {
  tramites_estado: TramitesEstadoMap;
  tramites_completados: number;
  referencia_cliente: string | null;
  notas: string | null;
  actualizado_en: string;
  version: number;
}

export async function aplicarPatchExpediente(
  id: string,
  clerkOrgId: string,
  clerkUserId: string,
  patch: PatchExpedienteInput
): Promise<PatchExpedienteResult> {
  // obtenerExpediente ya filtra por org_id: un usuario de otra organización
  // recibe null y nunca llega al UPDATE (evita IDOR, misma lección que alertas).
  const expediente = await obtenerExpediente(id, clerkOrgId);
  if (!expediente) {
    throw new Error("EXPEDIENTE_NO_ENCONTRADO");
  }

  const update: Record<string, unknown> = {
    actualizado_en: new Date().toISOString(),
    version: expediente.version + 1,
  };

  // Se rellena solo si patch.tramite trae un cambio de estado, para
  // insertar después la fila de auditoría (fuera de esta transacción:
  // Supabase REST no da transacciones multi-tabla sin RPC, así que el
  // registro de auditoría es "best effort" tras el UPDATE principal).
  let auditoria: { orden: number; estadoAnterior: string; estadoNuevo: string } | null = null;

  if (patch.tramite) {
    const { orden, estado } = patch.tramite;
    const totalTramites = expediente.plan_tramitacion?.tramites?.length ?? 0;
    if (!Number.isInteger(orden) || orden < 1 || orden > totalTramites) {
      throw new Error("ORDEN_INVALIDO");
    }

    const mapa: TramitesEstadoMap = { ...(expediente.tramites_estado ?? {}) };
    const clave = String(orden);
    const estadoAnterior = mapa[clave]?.estado ?? "pendiente";

    if (estado === "pendiente") {
      delete mapa[clave];
    } else {
      const previo = mapa[clave];
      mapa[clave] = {
        estado,
        fecha_inicio: previo?.fecha_inicio ?? hoyIso(),
        fecha_completado: estado === "completado" ? hoyIso() : null,
      };
    }

    update.tramites_estado = mapa;
    update.tramites_completados = Object.values(mapa).filter(
      (t) => t.estado === "completado"
    ).length;

    auditoria = { orden, estadoAnterior, estadoNuevo: estado };
  }

  if (patch.referencia_cliente !== undefined) {
    update.referencia_cliente =
      patch.referencia_cliente?.trim().slice(0, 120) || null;
  }
  if (patch.notas !== undefined) {
    update.notas = patch.notas?.trim().slice(0, 4000) || null;
  }

  let query = supabaseAdmin
    .from("expedientes")
    .update(update)
    .eq("id", id)
    .eq("org_id", expediente.org_id);

  // Compare-And-Swap: si el cliente indicó la versión que leyó, exigimos
  // que siga vigente. Si otro operario ya escribió antes, el WHERE no
  // encuentra fila, el UPDATE afecta a 0 filas y `data` vuelve null.
  if (patch.version !== undefined) {
    query = query.eq("version", patch.version);
  }

  const { data, error } = await query
    .select(
      "tramites_estado, tramites_completados, referencia_cliente, notas, actualizado_en, version"
    )
    .maybeSingle();

  if (error) {
    throw new Error(`Error actualizando expediente: ${error.message}`);
  }
  if (!data) {
    throw new Error("CONFLICTO_VERSION");
  }

  if (auditoria) {
    const { error: auditError } = await supabaseAdmin.from("historial_tramites").insert({
      expediente_id: id,
      orden: auditoria.orden,
      estado_anterior: auditoria.estadoAnterior,
      estado_nuevo: auditoria.estadoNuevo,
      operador_id: clerkUserId,
    });
    // Best-effort: un fallo al auditar no debe deshacer un cambio de estado
    // que ya se persistió correctamente y que el usuario ya ve confirmado.
    if (auditError) {
      console.error(
        `No se pudo registrar auditoría del trámite ${auditoria.orden} en expediente ${id}: ${auditError.message}`
      );
    }
  }

  return data as PatchExpedienteResult;
}

/**
 * Devuelve el token del portal de cliente de solo lectura para este
 * expediente, generándolo si no existe (o rotándolo si `regenerar` es true,
 * lo que invalida cualquier enlace ya compartido). Token opaco (UUID
 * aleatorio), no reversible ni predecible: no expone el id interno del
 * expediente ni ningún dato hasta que se resuelve contra la tabla.
 */
export async function obtenerOCrearShareToken(
  id: string,
  clerkOrgId: string,
  regenerar = false
): Promise<string> {
  const orgId = await ensureOrgId(clerkOrgId);

  const { data: expediente, error: fetchError } = await supabaseAdmin
    .from("expedientes")
    .select("share_token")
    .eq("id", id)
    .eq("org_id", orgId)
    .single();

  if (fetchError || !expediente) {
    throw new Error("EXPEDIENTE_NO_ENCONTRADO");
  }

  if (expediente.share_token && !regenerar) {
    return expediente.share_token;
  }

  const nuevoToken = randomUUID();
  const { error: updateError } = await supabaseAdmin
    .from("expedientes")
    .update({ share_token: nuevoToken })
    .eq("id", id)
    .eq("org_id", orgId);

  if (updateError) {
    throw new Error(`Error generando el enlace: ${updateError.message}`);
  }

  return nuevoToken;
}

export function obtenerKpis(expedientes: DbExpediente[]) {
  return {
    total: expedientes.length,
    en_tramitacion: expedientes.filter(
      (expediente) =>
        expediente.estado === "pendiente" || expediente.estado === "en_revision"
    ).length,
    aprobados: expedientes.filter((expediente) => expediente.estado === "aprobado").length,
    borradores: expedientes.filter((expediente) => expediente.estado === "borrador").length,
  };
}
