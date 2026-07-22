import type { TramiteEstadoInfo } from "@/types/plan";

const MS_DIA = 86_400_000;

export function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function diasEntre(desdeIso: string, hastaIso: string = hoyIso()): number {
  const desde = new Date(`${desdeIso}T00:00:00Z`).getTime();
  const hasta = new Date(`${hastaIso}T00:00:00Z`).getTime();
  if (Number.isNaN(desde) || Number.isNaN(hasta)) return 0;
  return Math.floor((hasta - desde) / MS_DIA);
}

export interface PlazoCalculado {
  diasTranscurridos: number;
  diasRestantes: number | null; // null si el trámite no tiene plazo legal
  vencido: boolean;
}

export function calcularPlazo(
  info: TramiteEstadoInfo | undefined,
  plazoLegalDias: number | null
): PlazoCalculado | null {
  if (!info || info.estado !== "en_curso" || !info.fecha_inicio) return null;
  const diasTranscurridos = diasEntre(info.fecha_inicio);
  if (!plazoLegalDias) {
    return { diasTranscurridos, diasRestantes: null, vencido: false };
  }
  const diasRestantes = plazoLegalDias - diasTranscurridos;
  return { diasTranscurridos, diasRestantes, vencido: diasRestantes < 0 };
}
