import { supabaseAdmin, type DbExpediente } from "./supabase";
import type { FormState } from "@/components/nueva-instalacion/types";
import type { PlanTramitacion } from "@/types/plan";

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
      municipio: formState.municipio,
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

export async function actualizarEstado(
  id: string,
  clerkOrgId: string,
  estado: DbExpediente["estado"],
  tramitesCompletados?: number
): Promise<void> {
  const orgId = await ensureOrgId(clerkOrgId);
  const patch: Partial<Pick<DbExpediente, "estado" | "tramites_completados">> = {
    estado,
  };

  if (tramitesCompletados !== undefined) {
    patch.tramites_completados = tramitesCompletados;
  }

  const { error } = await supabaseAdmin
    .from("expedientes")
    .update(patch)
    .eq("id", id)
    .eq("org_id", orgId);

  if (error) throw new Error(`Error actualizando estado: ${error.message}`);
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

export async function obtenerKpis(clerkOrgId: string) {
  const expedientes = await listarExpedientes(clerkOrgId);

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
