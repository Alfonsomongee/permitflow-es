import { supabaseAdmin } from "./supabase";
import { claveTramite } from "./tramiteClave";
import type { EstadisticaPlazo, Tramite } from "@/types/plan";

export async function obtenerEstadisticasPlazo(
  comunidad: string,
  tipoInstalacion: string,
  tramites: Tramite[]
): Promise<Record<string, EstadisticaPlazo>> {
  if (tramites.length === 0) return {};

  const claves = Array.from(new Set(tramites.map(claveTramite)));

  const { data } = await supabaseAdmin
    .from("estadisticas_plazos")
    .select(
      "clave_tramite, nombre_tramite, plazo_legal_dias, muestra_n, media_real_dias, mediana_real_dias"
    )
    .eq("comunidad", comunidad)
    .eq("tipo_instalacion", tipoInstalacion)
    .in("clave_tramite", claves);

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
