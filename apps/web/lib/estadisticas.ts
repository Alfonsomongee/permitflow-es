import { supabaseAdmin, type DbExpediente } from "./supabase";
import { claveTramite } from "./tramiteClave";
import type { EstadisticaPlazo, Tramite } from "@/types/plan";
import type { KPIData } from "@/components/dashboard/KpiCards";
import type { TendenciaData, EstadoData } from "@/components/dashboard/StatsCharts";

export async function obtenerEstadisticasPlazo(
  comunidad: string,
  tipoInstalacion: string,
  tramites: Tramite[]
): Promise<Record<string, EstadisticaPlazo>> {
  if (tramites.length === 0) return {};

  const claves = Array.from(new Set(tramites.map(claveTramite)));

  const { data, error } = await supabaseAdmin
    .from("estadisticas_plazos")
    .select(
      "clave_tramite, nombre_tramite, plazo_legal_dias, muestra_n, media_real_dias, mediana_real_dias"
    )
    .eq("comunidad", comunidad)
    .eq("tipo_instalacion", tipoInstalacion)
    .in("clave_tramite", claves);

  // Descartar el error hacía indistinguibles "aún no hay muestra suficiente" y
  // "la consulta ha fallado": la UI mostraba el mismo vacío en ambos casos. De
  // hecho la tabla NO existe en producción (la migración
  // 20260712090000_estadisticas_plazos.sql nunca se aplicó, verificado el
  // 2026-08-23), así que esta rama llevaba fallando en silencio desde siempre.
  // Se sigue degradando a {} -- los plazos reales son un extra, no deben tumbar
  // la página -- pero ahora deja rastro.
  if (error) {
    console.error(
      `[estadisticas_plazos] consulta fallida (${comunidad}/${tipoInstalacion}): ${error.message}`
    );
    return {};
  }

  const resultado: Record<string, EstadisticaPlazo> = {};
  for (const fila of data ?? []) {
    resultado[fila.clave_tramite] = {
      claveTramite: fila.clave_tramite,
      nombreTramite: fila.nombre_tramite,
      plazoLegalDias: fila.plazo_legal_dias,
      muestraN: fila.muestra_n,
      mediaRealDias: Number(fila.media_real_dias),
      medianaRealDias: Number(fila.mediana_real_dias),
    };
  }
  return resultado;
}

const MESES_ES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const ESTADO_LABELS: Record<DbExpediente["estado"], string> = {
  borrador: "Borrador",
  pendiente: "Presentado",
  en_revision: "En revisión",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

const ESTADO_COLORES: Record<string, string> = {
  Borrador: "var(--text-secondary)",
  Presentado: "var(--primary)",
  "En revisión": "var(--warning)",
  Aprobado: "var(--success)",
  Rechazado: "var(--danger)",
};

/** Umbral por debajo del cual una media/tasa se considera poco representativa. */
export const MUESTRA_MINIMA_ORG = 5;

export interface EstadisticasReales {
  kpis: KPIData;
  tendencia: TendenciaData[];
  estados: EstadoData[];
  /** true si hay menos de MUESTRA_MINIMA_ORG expedientes: la UI debe avisar
   * de que la tasa de éxito / tiempo medio aún no es representativo. */
  muestraInsuficiente: boolean;
}

/**
 * Calcula KPIs, tendencia mensual y distribución por estado a partir de los
 * expedientes reales de la organización (ya cargados por listarExpedientes,
 * sin consulta adicional). Sustituye a los datos de ejemplo que antes vivían
 * en lib/demo-data.ts (borrado por código muerto, auditoría fase 2, P-20).
 *
 * Aproximaciones deliberadas, documentadas para no confundirlas con hechos:
 * - "tiempo_medio_dias" usa actualizado_en como fecha de resolución de los
 *   expedientes aprobados, porque no existe una columna dedicada de fecha de
 *   cierre. Si actualizado_en cambia por otro motivo tras la aprobación, el
 *   dato se desvía; es una estimación, no un cronómetro exacto.
 * - "resueltos" en la tendencia mensual usa el mismo criterio (mes de
 *   actualizado_en) para expedientes aprobados o rechazados ese mes.
 */
export function calcularEstadisticasReales(
  expedientes: DbExpediente[]
): EstadisticasReales {
  const total = expedientes.length;
  const aprobados = expedientes.filter((e) => e.estado === "aprobado");
  const rechazados = expedientes.filter((e) => e.estado === "rechazado");
  const resueltos = aprobados.length + rechazados.length;

  const tasaAprobacion =
    resueltos > 0 ? Math.round((aprobados.length / resueltos) * 100) : 0;

  const duracionesDias = aprobados
    .map((e) => {
      const inicio = new Date(e.creado_en).getTime();
      const fin = new Date(e.actualizado_en).getTime();
      if (Number.isNaN(inicio) || Number.isNaN(fin) || fin < inicio) return null;
      return Math.round((fin - inicio) / 86_400_000);
    })
    .filter((d): d is number => d !== null);

  const tiempoMedioDias =
    duracionesDias.length > 0
      ? Math.round(
          duracionesDias.reduce((acc, d) => acc + d, 0) / duracionesDias.length
        )
      : 0;

  const tiposActivos = new Set(expedientes.map((e) => e.tipo_instalacion)).size;

  const ahora = new Date();
  const tendencia: TendenciaData[] = [];
  for (let i = 5; i >= 0; i--) {
    const cursor = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const anio = cursor.getFullYear();
    const mes = cursor.getMonth();

    const creados = expedientes.filter((e) => {
      const f = new Date(e.creado_en);
      return f.getFullYear() === anio && f.getMonth() === mes;
    }).length;

    const resueltosMes = expedientes.filter((e) => {
      if (e.estado !== "aprobado" && e.estado !== "rechazado") return false;
      const f = new Date(e.actualizado_en);
      return f.getFullYear() === anio && f.getMonth() === mes;
    }).length;

    tendencia.push({ mes: MESES_ES[mes], creados, resueltos: resueltosMes });
  }

  const conteoEstados = new Map<string, number>();
  for (const e of expedientes) {
    const label = ESTADO_LABELS[e.estado] ?? e.estado;
    conteoEstados.set(label, (conteoEstados.get(label) ?? 0) + 1);
  }
  const estados: EstadoData[] = Array.from(conteoEstados.entries()).map(
    ([estado, cantidad]) => ({
      estado,
      cantidad,
      color: ESTADO_COLORES[estado] ?? "var(--text-secondary)",
    })
  );

  return {
    kpis: {
      total_expedientes: total,
      tasa_aprobacion: tasaAprobacion,
      tiempo_medio_dias: tiempoMedioDias,
      tipos_activos: tiposActivos,
    },
    tendencia,
    estados,
    muestraInsuficiente: total < MUESTRA_MINIMA_ORG,
  };
}
