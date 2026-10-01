import { randomUUID } from "node:crypto";
import { supabaseAdmin, type DbExpediente } from "./supabase";
import type { FormState } from "@/components/nueva-instalacion/types";
import type {
  PlanTramitacion,
  TramiteEstado,
  TramitesEstadoMap,
} from "@/types/plan";
import { hoyIso } from "./plazos";
import { BUCKET_DOCUMENTOS_CLIENTE } from "./documentos-cliente";
import { construirPayloadClasificador } from "./clasificador-payload";

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

  // Carrera con el webhook de Clerk (organization.created): si otro proceso ya
  // insertó la fila, la clave única falla -- se relee en vez de devolver un 500.
  if (createError?.code === "23505") {
    const { data: existente } = await supabaseAdmin
      .from("organizaciones")
      .select("id")
      .eq("clerk_org_id", clerkOrgId)
      .maybeSingle();
    if (existente?.id) return existente.id;
  }

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
      // Payload completo: lo necesitan /validar, el asistente y cualquier recálculo.
      parametros: construirPayloadClasificador(formState),
      tiempo_total_dias: plan.tiempo_total_estimado_dias,
      estado: "pendiente",
      tramites_completados: 0,
    })
    .select()
    .single();

  if (error) throw new Error(`Error creando expediente: ${error.message}`);
  return data;
}

/** Expedientes creados por la organización desde `desdeIso` (cuota mensual del plan Free). */
export async function contarExpedientesDesde(clerkOrgId: string, desdeIso: string): Promise<number> {
  const orgId = await ensureOrgId(clerkOrgId);

  const { count, error } = await supabaseAdmin
    .from("expedientes")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .gte("creado_en", desdeIso);

  if (error) throw new Error(`Error contando expedientes: ${error.message}`);
  return count ?? 0;
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

export interface ExpedienteResumen {
  id: string;
  referencia_cliente: string | null;
  comunidad: string;
  tipo_instalacion: string;
  estado: DbExpediente["estado"];
}

/**
 * Listado ligero para el Command Palette (Cmd+K): solo las columnas que se
 * muestran y un tope, en vez de descargar `select("*")` -- con el
 * `plan_tramitacion` JSONB de TODOS los expedientes -- para quedarse con 50.
 */
export async function listarResumenExpedientes(
  clerkOrgId: string,
  limite = 50
): Promise<ExpedienteResumen[]> {
  const orgId = await ensureOrgId(clerkOrgId);

  const { data, error } = await supabaseAdmin
    .from("expedientes")
    .select("id, referencia_cliente, comunidad, tipo_instalacion, estado")
    .eq("org_id", orgId)
    .order("actualizado_en", { ascending: false })
    .limit(limite);

  if (error) throw new Error(`Error listando expedientes: ${error.message}`);
  return (data ?? []) as ExpedienteResumen[];
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

  // Los archivos que subió el cliente final viven en Storage: el DELETE en cascada
  // borra las filas de `documentos_cliente` pero NO los objetos, que quedarían
  // huérfanos con datos personales (derecho de supresión, RGPD).
  const { data: expediente } = await supabaseAdmin
    .from("expedientes")
    .select("id")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!expediente) return;

  const { data: documentos } = await supabaseAdmin
    .from("documentos_cliente")
    .select("storage_path")
    .eq("expediente_id", id);
  const rutas = (documentos ?? []).map((d) => d.storage_path as string).filter(Boolean);
  if (rutas.length > 0) {
    const { error: storageError } = await supabaseAdmin.storage
      .from(BUCKET_DOCUMENTOS_CLIENTE)
      .remove(rutas);
    if (storageError) {
      // No se borra la fila si no se pudieron borrar los archivos: así el
      // reintento del usuario sigue encontrando las rutas.
      throw new Error(`Error eliminando los documentos del cliente: ${storageError.message}`);
    }
  }

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
