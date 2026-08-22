import { supabaseAdmin } from "./supabase";
import type { DbAlertaBoe, DbExpediente } from "./supabase";

export interface ExpedienteAfectado {
  id: string;
  etiqueta: string;
}

const ESTADOS_ACTIVOS = new Set(["borrador", "pendiente", "en_revision"]);

export type ExpedienteMatch = Pick<
  DbExpediente,
  "id" | "comunidad" | "tipo_instalacion" | "estado" | "referencia_cliente" | "creado_en"
>;

/** Alertas globales (sin org) + específicas de la organización, sin filtrar
 * por expediente ni por estado de lectura. Extraído de alertas/page.tsx y
 * alertasNoLeidasParaExpediente, que repetían la misma resolución de
 * org_id + consulta -- origen: roadmap de mejoras, PREM-08. */
export async function obtenerAlertasOrg(clerkOrgId: string): Promise<DbAlertaBoe[]> {
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
  return data ?? [];
}

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

/**
 * true si la alerta afecta a alguna CCAA/vertical que la organización
 * trabaja de verdad (a partir de todo su histórico de expedientes, no solo
 * los activos: un expediente ya aprobado sigue diciendo "trabajamos en esta
 * CCAA/vertical" a efectos de qué cambios normativos interesan). Origen:
 * roadmap de mejoras, QW-02 -- antes todas las alertas se mostraban por
 * igual a cualquier organización, aunque no tuviera ni un solo expediente
 * en esa CCAA o vertical.
 *
 * Sin cartera todavía (organización nueva, cero expedientes) se considera
 * relevante por defecto: no hay base real sobre la que filtrar, y ocultar
 * todo sería peor que mostrar de más.
 */
export function alertaRelevanteParaCartera(
  alerta: DbAlertaBoe,
  expedientes: ExpedienteMatch[]
): boolean {
  if (expedientes.length === 0) return true;
  return expedientes.some((e) => alertaAfectaExpediente(alerta, e));
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
      .map((e) => ({ id: e.id, etiqueta: e.referencia_cliente ?? e.tipo_instalacion }));
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

  const todas = await obtenerAlertasOrg(clerkOrgId);
  const alertas = todas.filter((a) => alertaAfectaExpediente(a, expediente));

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

/**
 * true si `alerta` fue verificada por un humano y aplicada al motor
 * normativo (no una sugerencia de IA sin revisar) DESPUÉS de crearse el
 * expediente -- el plan que tiene guardado el expediente pudo generarse
 * con la normativa anterior a ese cambio. Origen: roadmap de mejoras,
 * PREM-08 ("impacto retroactivo de cambios normativos sobre expedientes
 * activos").
 */
export function alertaEsPosteriorAExpediente(
  alerta: DbAlertaBoe,
  expediente: Pick<ExpedienteMatch, "creado_en">
): boolean {
  return alerta.aplicada && !!alerta.aplicada_en && alerta.aplicada_en > expediente.creado_en;
}

/** Combina afecta + verificada + posterior: el caso real de impacto
 * retroactivo, no solo "alerta relacionada" (que también incluye
 * sugerencias de IA sin revisar y cambios ya vigentes cuando se creó el
 * expediente). */
export function alertaImpactaRetroactivamente(
  alerta: DbAlertaBoe,
  expediente: ExpedienteMatch
): boolean {
  return alertaAfectaExpediente(alerta, expediente) && alertaEsPosteriorAExpediente(alerta, expediente);
}

export interface ExpedienteConImpactoRetroactivo {
  expediente: ExpedienteMatch;
  alertas: DbAlertaBoe[];
}

/** Expedientes activos con al menos un cambio normativo verificado y
 * aplicado después de su creación. Restringido a activos (mismo criterio
 * que mapearAlertasAExpedientes): un expediente ya aprobado o rechazado no
 * se puede "retomar" para incorporar el cambio de la misma forma. */
export function expedientesConImpactoRetroactivo(
  alertas: DbAlertaBoe[],
  expedientes: ExpedienteMatch[]
): ExpedienteConImpactoRetroactivo[] {
  const activos = expedientes.filter((e) => ESTADOS_ACTIVOS.has(e.estado));
  const resultado: ExpedienteConImpactoRetroactivo[] = [];
  for (const expediente of activos) {
    const afectantes = alertas.filter((a) => alertaImpactaRetroactivamente(a, expediente));
    if (afectantes.length > 0) {
      resultado.push({ expediente, alertas: afectantes });
    }
  }
  return resultado;
}
