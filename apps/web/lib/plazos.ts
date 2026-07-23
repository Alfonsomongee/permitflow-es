import type { TramiteEstadoInfo } from "@/types/plan";
import { calcularVencimientoHabil } from "./festivos";

const MS_DIA = 86_400_000;

export function hoyIso(): string {
  // "Hoy" en la zona horaria administrativa española, no en UTC del servidor:
  // a las 00:30 de Madrid, toISOString() todavía devuelve la fecha de ayer,
  // lo que desplazaría fechas de inicio/completado de trámites legales.
  // "en-CA" formatea como YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(
    new Date()
  );
}

export function diasEntre(desdeIso: string, hastaIso: string = hoyIso()): number {
  const desde = new Date(`${desdeIso}T00:00:00Z`).getTime();
  const hasta = new Date(`${hastaIso}T00:00:00Z`).getTime();
  if (Number.isNaN(desde) || Number.isNaN(hasta)) return 0;
  return Math.floor((hasta - desde) / MS_DIA);
}

export interface PlazoCalculado {
  diasTranscurridos: number; // días naturales desde el inicio (informativo)
  diasRestantes: number | null; // días naturales hasta el vencimiento legal (hábil)
  vencido: boolean;
  fechaVencimiento: string | null;
  /** false = el año de inicio no tiene calendario de festivos cargado (ver lib/festivos.ts) */
  calendarioVerificado: boolean;
}

export function calcularPlazo(
  info: TramiteEstadoInfo | undefined,
  plazoLegalDias: number | null,
  comunidad: string
): PlazoCalculado | null {
  if (!info || info.estado !== "en_curso" || !info.fecha_inicio) return null;
  const diasTranscurridos = diasEntre(info.fecha_inicio);

  if (!plazoLegalDias) {
    return {
      diasTranscurridos,
      diasRestantes: null,
      vencido: false,
      fechaVencimiento: null,
      calendarioVerificado: true,
    };
  }

  const { fechaVencimiento, calendarioVerificado } = calcularVencimientoHabil(
    info.fecha_inicio,
    plazoLegalDias,
    comunidad
  );
  const diasRestantes = diasEntre(hoyIso(), fechaVencimiento);

  return {
    diasTranscurridos,
    diasRestantes,
    vencido: diasRestantes < 0,
    fechaVencimiento,
    calendarioVerificado,
  };
}
