// PENDIENTE DE VERIFICACIÓN CON URL DIRECTA — no dar por definitivos estos valores.
// Fuente actual: informe de verificación de segunda mano sin enlaces comprobables.
// Ver sesión de verificación de PermitFlow ES del 27/07/2026.

export type NivelVerificacion = "verificada" | "generica_pendiente_url";

export type DeduccionAutonomica = {
  existe: boolean;
  pct_min?: number;   // porcentaje mínimo (puede ser escalonado)
  pct_max?: number;   // porcentaje máximo
  base_maxima_eur?: number;
  nota?: string;
  fuente_url: null;   // siempre null hasta que se verifique con URL real
  nivel_verificacion: NivelVerificacion;
};

export type IncentivosCAA = {
  slug: string;
  deduccion_irpf_autonomica: DeduccionAutonomica;
  nota_ui?: string;   // texto especial que mostrar en la UI si el importe no está localizado
};

// Deducciones estatales verificadas — nivel_verificacion: "verificada"
export const deduccionesEstatalesRD19_2021 = {
  base_legal: "RD 19/2021 (Disposición derogatoria + Ley 10/2022)",
  nivel_verificacion: "verificada" as NivelVerificacion,
  deducciones: [
    { pct: 20, descripcion: "Reducción demanda calefac./refrig. ≥10%", limite_eur: 5000, vigente_hasta: "31/12/2026" },
    { pct: 40, descripcion: "Reducción consumo energía primaria ≥30% o clase energética A/B", limite_eur: 7500, vigente_hasta: "31/12/2026" },
    { pct: 60, descripcion: "Rehabilitación energética edificio residencial", limite_eur: 5000, limite_acumulado_eur: 15000, vigente_hasta: "31/12/2027" },
  ],
  requisito: "Certificado de Eficiencia Energética (CEE) antes y después de la obra.",
} as const;

// Deducción autoconsumo RDL 7/2026 — nivel_verificacion: "verificada" (BOE 21/03/2026)
export const deduccionAutoconsumoRDL7_2026 = {
  base_legal: "RDL 7/2026, DA 62ª LIRPF",
  individual: { pct: 10, base_maxima_eur: 5000 },
  edificio_residencial: { pct: 20, base_maxima_eur: 5000 },
  incompatible_entre_si: true,
  incluye_almacenamiento: true,
  vigencia: "Instalación finalizada en 2026",
  nivel_verificacion: "verificada" as NivelVerificacion,
  nota: "Deducción distinta e independiente de RD 19/2021. No confirmado si es acumulable sobre el mismo gasto que la deducción de rehabilitación energética — verificar antes de sumar ambas en el cálculo de ahorro fiscal mostrado al usuario.",
} as const;

// Deducción IRPF 15% recarga IRVE — nivel_verificacion: "verificada" (RDL 7/2026)
export const deduccionIRVE_IRPF15 = {
  base_legal: "DA LIRPF prorrogada por RDL 7/2026",
  pct: 15,
  max_ahorro_recarga_eur: 600,
  descripcion: "Cubre compra de vehículo eléctrico y/o instalación de punto de recarga particular.",
  nivel_verificacion: "verificada" as NivelVerificacion,
  nota: "El Programa Auto+ (RD 609/2026) cubre exclusivamente la compra del vehículo. No cubre instalación de punto de recarga. Son incentivos distintos y no excluyentes para el mismo vehículo.",
} as const;

// Tabla de deducciones autonómicas por CCAA — todas generica_pendiente_url
export const incentivosCAA: Record<string, IncentivosCAA> = {
  andalucia: {
    slug: "andalucia",
    deduccion_irpf_autonomica: { existe: false, fuente_url: null, nivel_verificacion: "generica_pendiente_url" },
  },
  aragon: {
    slug: "aragon",
    deduccion_irpf_autonomica: { existe: false, fuente_url: null, nivel_verificacion: "generica_pendiente_url" },
  },
  asturias: {
    slug: "asturias",
    deduccion_irpf_autonomica: { existe: false, fuente_url: null, nivel_verificacion: "generica_pendiente_url" },
  },
  illes_balears: {
    slug: "illes_balears",
    deduccion_irpf_autonomica: {
      existe: true,
      pct_min: 50,
      pct_max: 50,
      base_maxima_eur: 10000,
      nota: "Por inversiones de mejora de sostenibilidad en vivienda habitual.",
      fuente_url: null,
      nivel_verificacion: "generica_pendiente_url",
    },
  },
  canarias: {
    slug: "canarias",
    deduccion_irpf_autonomica: {
      existe: true,
      pct_min: 12,
      pct_max: 12,
      base_maxima_eur: 7000,
      nota: "Por obras de rehabilitación energética y reforma de vivienda habitual.",
      fuente_url: null,
      nivel_verificacion: "generica_pendiente_url",
    },
  },
  cantabria: {
    slug: "cantabria",
    deduccion_irpf_autonomica: {
      existe: true,
      pct_min: 15,
      pct_max: 15,
      base_maxima_eur: 1500,
      nota: "Por obras de mejora en viviendas. Límite: 1.000 € declaración individual, 1.500 € declaración conjunta.",
      fuente_url: null,
      nivel_verificacion: "generica_pendiente_url",
    },
  },
  castilla_la_mancha: {
    slug: "castilla_la_mancha",
    deduccion_irpf_autonomica: {
      existe: true,
      // Importe NO LOCALIZADO — no mostrar cifras en la UI
      fuente_url: null,
      nivel_verificacion: "generica_pendiente_url",
    },
    nota_ui: "Existe deducción autonómica — consultar Hacienda de Castilla-La Mancha para importe exacto.",
  },
  castilla_y_leon: {
    slug: "castilla_y_leon",
    deduccion_irpf_autonomica: {
      existe: true,
      pct_min: 15,
      pct_max: 15,
      base_maxima_eur: 20000,
      nota: "Por inversión en instalaciones medioambientales en vivienda habitual.",
      fuente_url: null,
      nivel_verificacion: "generica_pendiente_url",
    },
  },
  catalunya: {
    slug: "catalunya",
    deduccion_irpf_autonomica: { existe: false, fuente_url: null, nivel_verificacion: "generica_pendiente_url" },
  },
  comunitat_valenciana: {
    slug: "comunitat_valenciana",
    deduccion_irpf_autonomica: {
      existe: true,
      pct_min: 20,
      pct_max: 40,
      base_maxima_eur: 8800,
      nota: "40% vivienda habitual / 20% segunda residencia. Por cantidades invertidas en instalaciones de autoconsumo o generación renovable.",
      fuente_url: null,
      nivel_verificacion: "generica_pendiente_url",
    },
  },
  extremadura: {
    slug: "extremadura",
    deduccion_irpf_autonomica: { existe: false, fuente_url: null, nivel_verificacion: "generica_pendiente_url" },
  },
  galicia: {
    slug: "galicia",
    deduccion_irpf_autonomica: {
      existe: true,
      pct_min: 15,
      pct_max: 15,
      base_maxima_eur: 9000,
      nota: "Por obras de mejora de eficiencia energética en viviendas.",
      fuente_url: null,
      nivel_verificacion: "generica_pendiente_url",
    },
  },
  la_rioja: {
    slug: "la_rioja",
    deduccion_irpf_autonomica: { existe: false, fuente_url: null, nivel_verificacion: "generica_pendiente_url" },
  },
  madrid: {
    slug: "madrid",
    deduccion_irpf_autonomica: { existe: false, fuente_url: null, nivel_verificacion: "generica_pendiente_url" },
  },
  region_de_murcia: {
    slug: "region_de_murcia",
    deduccion_irpf_autonomica: {
      existe: true,
      pct_min: 25,
      pct_max: 50,
      base_maxima_eur: 7000,
      nota: "Escalonado por renta: 50%/37,5%/25%. Por inversión en instalación de recursos energéticos renovables.",
      fuente_url: null,
      nivel_verificacion: "generica_pendiente_url",
    },
  },
  navarra: {
    slug: "navarra",
    deduccion_irpf_autonomica: {
      existe: true,
      pct_min: 15,
      pct_max: 15,
      nota: "Art. 64 Ley Foral IRPF. Límite: 25% de la base liquidable.",
      fuente_url: null,
      nivel_verificacion: "generica_pendiente_url",
    },
  },
  pais_vasco: {
    slug: "pais_vasco",
    deduccion_irpf_autonomica: {
      existe: true,
      pct_min: 15,
      pct_max: 15,
      base_maxima_eur: 20000,
      nota: "Art. 90 quater Norma Foral IRPF (Bizkaia). Deducción neta máxima 3.000 €. Verificar equivalentes en Álava/Gipuzkoa.",
      fuente_url: null,
      nivel_verificacion: "generica_pendiente_url",
    },
  },
  ceuta: {
    slug: "ceuta",
    deduccion_irpf_autonomica: { existe: false, fuente_url: null, nivel_verificacion: "generica_pendiente_url" },
  },
  melilla: {
    slug: "melilla",
    deduccion_irpf_autonomica: { existe: false, fuente_url: null, nivel_verificacion: "generica_pendiente_url" },
  },
};
