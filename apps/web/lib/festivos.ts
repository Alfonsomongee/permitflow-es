/**
 * Calendario de días inhábiles a efectos de cómputo de plazos administrativos
 * (Ley 39/2015, art. 30.7) — NO el calendario laboral general.
 *
 * Fuente oficial: Resolución de 18 de noviembre de 2025, de la Secretaría de
 * Estado de Función Pública (BOE-A-2025-23702), calendario de días inhábiles
 * de la AGE para 2026.
 * https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-23702
 *
 * Cobertura deliberadamente limitada a festivos nacionales y de Comunidad
 * Autónoma. NO incluye festivos locales/municipales (2 días por
 * ayuntamiento) — mantenerlo para >8000 municipios no es viable a mano.
 * El vencimiento calculado puede quedar, como mucho, 1-2 días hábiles
 * optimista si el municipio tiene festivo local en medio del plazo.
 *
 * MANTENIMIENTO ANUAL: cada noviembre el BOE publica la resolución del año
 * siguiente. Hay que añadir aquí una nueva entrada en FESTIVOS_NACIONALES y
 * FESTIVOS_CCAA. Si un año no está cargado, el cálculo degrada de forma
 * segura a "solo fines de semana" y devuelve `calendarioVerificado: false`
 * para que la UI lo señale en vez de mostrar una fecha falsamente exacta.
 */

const FESTIVOS_NACIONALES: Record<number, string[]> = {
  2026: [
    "2026-01-01", // Año Nuevo
    "2026-01-06", // Epifanía del Señor
    "2026-04-03", // Viernes Santo
    "2026-05-01", // Fiesta del Trabajo
    "2026-10-12", // Fiesta Nacional de España
    "2026-12-08", // Inmaculada Concepción
    "2026-12-25", // Natividad del Señor
  ],
};

const FESTIVOS_CCAA: Record<number, Record<string, string[]>> = {
  2026: {
    andalucia: ["2026-04-02", "2026-11-02", "2026-12-07"],
    aragon: ["2026-04-02", "2026-04-23", "2026-11-02", "2026-12-07"],
    asturias: ["2026-04-02", "2026-09-08", "2026-11-02", "2026-12-07"],
    baleares: ["2026-03-02", "2026-04-02", "2026-04-06"],
    canarias: ["2026-04-02", "2026-11-02"],
    cantabria: ["2026-04-02", "2026-07-28", "2026-09-15", "2026-12-07"],
    castilla_la_mancha: ["2026-04-02", "2026-04-06", "2026-06-04", "2026-11-02"],
    castilla_leon: ["2026-04-02", "2026-04-23", "2026-11-02", "2026-12-07"],
    cataluna: ["2026-04-06", "2026-06-24", "2026-09-11"],
    comunidad_valenciana: ["2026-03-19", "2026-04-06", "2026-06-24", "2026-10-09"],
    extremadura: ["2026-04-02", "2026-09-08", "2026-11-02", "2026-12-07"],
    galicia: ["2026-03-19", "2026-04-02", "2026-06-24"],
    la_rioja: ["2026-04-06", "2026-06-09", "2026-12-07"],
    madrid: ["2026-04-02", "2026-11-02", "2026-12-07"],
    murcia: ["2026-03-19", "2026-04-02", "2026-06-09", "2026-12-07"],
    navarra: ["2026-03-19", "2026-04-02", "2026-04-06", "2026-11-02"],
    pais_vasco: ["2026-03-19", "2026-04-02", "2026-04-06"],
  },
};

export function anioSoportado(anio: number): boolean {
  return anio in FESTIVOS_NACIONALES;
}

function anioDe(fechaIso: string): number {
  return Number(fechaIso.slice(0, 4));
}

function esFinDeSemana(fechaIso: string): boolean {
  const dia = new Date(`${fechaIso}T00:00:00Z`).getUTCDay();
  return dia === 0 || dia === 6;
}

/** True si `fechaIso` es inhábil (fin de semana o festivo nacional/CCAA) para `comunidad`. */
export function esInhabil(fechaIso: string, comunidad: string): boolean {
  if (esFinDeSemana(fechaIso)) return true;
  const anio = anioDe(fechaIso);
  if ((FESTIVOS_NACIONALES[anio] ?? []).includes(fechaIso)) return true;
  return (FESTIVOS_CCAA[anio]?.[comunidad] ?? []).includes(fechaIso);
}

function sumarDiasNaturales(fechaIso: string, dias: number): string {
  const fecha = new Date(`${fechaIso}T00:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

export interface VencimientoCalculado {
  fechaVencimiento: string;
  /** false = año sin festivos cargados; solo se excluyeron sábados/domingos. */
  calendarioVerificado: boolean;
}

/**
 * Vencimiento de un plazo en días hábiles. Aplica el art. 30.3 (el cómputo
 * empieza el día hábil siguiente al de inicio) y el art. 30.5 (prórroga
 * automática si el último día es inhábil, que se cumple de forma natural
 * porque el bucle solo cuenta días hábiles, nunca se detiene en uno inhábil).
 */
export function calcularVencimientoHabil(
  fechaInicioIso: string,
  plazoDiasHabiles: number,
  comunidad: string
): VencimientoCalculado {
  const calendarioVerificado = anioSoportado(anioDe(fechaInicioIso));

  let cursor = fechaInicioIso;
  let habilesContados = 0;

  // Salvaguarda anti-bucle-infinito ante datos corruptos o plazos absurdos.
  const LIMITE_ITERACIONES = plazoDiasHabiles * 4 + 30;
  let iteraciones = 0;

  while (habilesContados < plazoDiasHabiles && iteraciones < LIMITE_ITERACIONES) {
    cursor = sumarDiasNaturales(cursor, 1);
    iteraciones++;
    if (!esInhabil(cursor, comunidad)) {
      habilesContados++;
    }
  }

  return { fechaVencimiento: cursor, calendarioVerificado };
}
