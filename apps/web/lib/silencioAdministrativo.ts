import type { Tramite, TramitesEstadoMap } from "@/types/plan";
import { calcularPlazo } from "./plazos";

export type EfectoSilencio = "positivo" | "negativo";

export interface SilencioDetectado {
  orden: number;
  nombreTramite: string;
  efecto: EfectoSilencio;
  organismo: string;
  baseLegal: string;
  fechaVencimiento: string;
  diasVencido: number;
  /** false = el año de inicio no tiene calendario de festivos cargado (lib/festivos.ts) */
  calendarioVerificado: boolean;
}

const MENSAJE_POR_EFECTO: Record<EfectoSilencio, string> = {
  positivo:
    "El organismo no ha resuelto dentro de plazo. Por silencio administrativo positivo (art. 24 Ley 39/2015), tu solicitud se considera ESTIMADA. Puedes acreditarlo ante terceros con el justificante de presentación de la solicitud, aunque el organismo no te haya respondido por escrito.",
  negativo:
    "El organismo no ha resuelto dentro de plazo. Por silencio administrativo negativo (art. 24 Ley 39/2015), tu solicitud se considera DESESTIMADA a efectos de poder recurrir. El silencio negativo no cierra la vía: te habilita a interponer recurso sin necesidad de seguir esperando una respuesta.",
};

export function mensajeSilencio(efecto: EfectoSilencio): string {
  return MENSAJE_POR_EFECTO[efecto];
}

/**
 * Trámites cuyo plazo legal ha vencido sin respuesta del organismo, entre
 * los que tienen un efecto de silencio administrativo verificado a mano
 * (Tramite.silencio_administrativo). Un trámite sin ese campo informado NO
 * se incluye aquí -- no se afirma un efecto legal sin haberlo verificado
 * contra la norma concreta (mismo criterio que nivel_verificacion/
 * huecos_verificacion en el resto del plan).
 *
 * Reutiliza calcularPlazo (lib/plazos.ts) para el cómputo de vencimiento en
 * días hábiles: es el mismo cálculo que ya alimenta PlazosActivos, para no
 * mantener dos fuentes de verdad sobre cuándo vence un plazo legal.
 */
export function detectarSilenciosVencidos(
  tramites: Tramite[],
  tramitesEstado: TramitesEstadoMap,
  comunidad: string
): SilencioDetectado[] {
  const resultado: SilencioDetectado[] = [];

  for (const t of tramites) {
    if (!t.silencio_administrativo || !t.plazo_legal_dias) continue;

    const info = tramitesEstado[String(t.orden)];
    const plazo = calcularPlazo(info, t.plazo_legal_dias, comunidad);
    if (!plazo || !plazo.vencido || !plazo.fechaVencimiento || plazo.diasRestantes === null) {
      continue;
    }

    resultado.push({
      orden: t.orden,
      nombreTramite: t.nombre,
      efecto: t.silencio_administrativo,
      organismo: t.organismo,
      baseLegal: t.base_legal,
      fechaVencimiento: plazo.fechaVencimiento,
      diasVencido: Math.abs(plazo.diasRestantes),
      calendarioVerificado: plazo.calendarioVerificado,
    });
  }

  return resultado;
}
