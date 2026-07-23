import { supabaseAdmin } from "./supabase";
import type { DbAlertaBoe, DbExpediente } from "./supabase";

export interface ExpedienteAfectado {
  id: string;
  etiqueta: string;
}

const ESTADOS_ACTIVOS = new Set(["borrador", "pendiente", "en_revision"]);

type ExpedienteMatch = Pick<
  DbExpediente,
  "id" | "comunidad" | "tipo_instalacion" | "estado" | "referencia_cliente" | "municipio"
>;

/** null o [] en el array de la alerta = afecta a todas las CCAA / verticales. */
export function alertaAfectaExpediente(
  alerta: DbAlertaBoe,
  expediente: ExpedienteMatch
): boolean {
  const ccaaOk =
    !alerta.ccaa_afectadas?.length ||
    alerta.ccaa_afectadas.includes(expediente.comunidad);
  const verticalOk =
    !alerta.verticales_afectados?.length ||
    alerta.verticales_afectados.includes(expediente.tipo_instalacion);
  return ccaaOk && verticalOk;
}

export function mapearAlertasAExpedientes(
  alertas: DbAlertaBoe[],
  expedientes: ExpedienteMatch[]
): Record<string, ExpedienteAfectado[]> {
  const activos = expedientes.filter((e) => ESTADOS_ACTIVOS.has(e.estado));
  const mapa: Record<string, ExpedienteAfectado[]> = {};
  for (const alerta of alertas) {
    mapa[alerta.id] = activos
      .filter((e) => alertaAfectaExpediente(alerta, e))
      .map((e) => ({ id: e.id, etiqueta: e.referencia_cliente ?? e.municipio }));
  }
  return mapa;
}

/** Alertas sin leer (globales + de la org) que afectan a un expediente concreto. */
export async function alertasNoLeidasParaExpediente(
  clerkOrgId: string,
  expediente: ExpedienteMatch
): Promise<DbAlertaBoe[]> {
  const { data: org } = await supabaseAdmin
    .from("organizaciones")
    .select("id")
    .eq("clerk_org_id", clerkOrgId)
    .maybeSingle();

  let query = supabaseAdmin.from("alertas_boe").select("*");
  query = org?.id
    ? query.or(`org_id.is.null,org_id.eq.${org.id}`)
    : query.is("org_id", null);

  const { data } = await query.order("creado_en", { ascending: false }).limit(50);
  const alertas = (data ?? []).filter((a) => alertaAfectaExpediente(a, expediente));

  // Excluir las ya leídas por ESTA organización (tabla alertas_leidas).
  if (!org?.id || alertas.length === 0) return alertas;
  const { data: leidas } = await supabaseAdmin
    .from("alertas_leidas")
    .select("alerta_id")
    .eq("org_id", org.id)
    .in(
      "alerta_id",
      alertas.map((a) => a.id)
    );
  const leidasSet = new Set((leidas ?? []).map((l) => l.alerta_id));
  return alertas.filter((a) => !leidasSet.has(a.id));
}
