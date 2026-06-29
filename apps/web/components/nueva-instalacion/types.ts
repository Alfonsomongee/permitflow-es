// Estado completo del formulario — refleja ClasificadorInput del backend

export interface FormState {
  // Paso 1: Tipo y ubicación
  tipo_instalacion: string;
  comunidad: string;
  municipio: string;
  uso: string;

  // Paso 2: Parámetros técnicos (varían por vertical)
  potencia_kw: string;
  superficie_m2: string;

  // IRVE
  numero_puntos: string;
  potencia_por_punto_kw: string;
  modo_recarga: string;
  acceso_publico: boolean;
  ubicacion_irve: string;
  requiere_nuevo_suministro: boolean;

  // Gas
  combustible: string;
  presion_bar: string;

  // Paso 3: Ayudas
  solicita_ayuda: boolean;
}

export const FORM_INITIAL: FormState = {
  tipo_instalacion: "fotovoltaica_autoconsumo",
  comunidad: "andalucia",
  municipio: "",
  uso: "residencial",
  potencia_kw: "",
  superficie_m2: "",
  numero_puntos: "1",
  potencia_por_punto_kw: "7.4",
  modo_recarga: "3",
  acceso_publico: false,
  ubicacion_irve: "garaje_comunitario",
  requiere_nuevo_suministro: false,
  combustible: "gas_natural",
  presion_bar: "normal",
  solicita_ayuda: false,
};

export type StepId = 1 | 2 | 3;

export interface StepMeta {
  id: StepId;
  label: string;
  description: (state: FormState) => string;
}

export const STEPS: StepMeta[] = [
  {
    id: 1,
    label: "Tipo y ubicación",
    description: (s) =>
      s.tipo_instalacion && s.comunidad
        ? `${TIPO_LABEL[s.tipo_instalacion] ?? s.tipo_instalacion} · ${COMUNIDAD_LABEL[s.comunidad] ?? s.comunidad}`
        : "Selecciona el tipo de instalación",
  },
  {
    id: 2,
    label: "Parámetros técnicos",
    description: (s) =>
      s.potencia_kw ? `${s.potencia_kw} kW` : "Potencia y características",
  },
  {
    id: 3,
    label: "Ayudas y subvenciones",
    description: () => "MOVES III, Next Gen EU…",
  },
];

// ─── Labels ──────────────────────────────────────────────────────────────────

export const TIPO_OPTIONS = [
  { value: "fotovoltaica_autoconsumo", label: "Fotovoltaica autoconsumo" },
  { value: "irve", label: "Recarga de vehículo eléctrico (IRVE)" },
  { value: "climatizacion_aerotermia", label: "Climatización y aerotermia" },
  { value: "acs", label: "Agua caliente sanitaria (ACS)" },
  { value: "gas_baja_presion", label: "Gas baja presión" },
];

export const COMUNIDAD_OPTIONS = [
  { value: "andalucia", label: "Andalucía" },
  { value: "aragon", label: "Aragón" },
  { value: "asturias", label: "Asturias" },
  { value: "baleares", label: "Baleares" },
  { value: "canarias", label: "Canarias" },
  { value: "cantabria", label: "Cantabria" },
  { value: "castilla_la_mancha", label: "Castilla-La Mancha" },
  { value: "castilla_leon", label: "Castilla y León" },
  { value: "cataluna", label: "Cataluña" },
  { value: "comunidad_valenciana", label: "C. Valenciana" },
  { value: "extremadura", label: "Extremadura" },
  { value: "galicia", label: "Galicia" },
  { value: "la_rioja", label: "La Rioja" },
  { value: "madrid", label: "Madrid" },
  { value: "murcia", label: "Murcia" },
  { value: "navarra", label: "Navarra" },
  { value: "pais_vasco", label: "País Vasco" },
];

export const USO_OPTIONS = [
  { value: "residencial", label: "Residencial" },
  { value: "terciario", label: "Terciario / comercial" },
  { value: "industrial", label: "Industrial" },
];

export const TIPO_LABEL: Record<string, string> = Object.fromEntries(
  TIPO_OPTIONS.map((o) => [o.value, o.label])
);

export const COMUNIDAD_LABEL: Record<string, string> = Object.fromEntries(
  COMUNIDAD_OPTIONS.map((o) => [o.value, o.label])
);

// Verticales disponibles con cobertura completa (Andalucía)
export const VERTICALES_ANDALUCIA = new Set([
  "fotovoltaica_autoconsumo",
  "irve",
  "climatizacion_aerotermia",
  "acs",
  "gas_baja_presion",
]);

/** Devuelve true si la combinación tipo+comunidad tiene normativa en el motor */
export function tieneCobertura(tipo: string, comunidad: string): boolean {
  if (comunidad === "andalucia") return VERTICALES_ANDALUCIA.has(tipo);
  // El resto de CCAA solo tienen fotovoltaica por ahora
  return tipo === "fotovoltaica_autoconsumo";
}

/** Construye los searchParams para la ruta del plan de tramitación */
export function buildPlanUrl(state: FormState): string {
  const params = new URLSearchParams({
    tipo_instalacion: state.tipo_instalacion,
    comunidad: state.comunidad,
    municipio: state.municipio,
    potencia_kw: state.potencia_kw,
    uso: state.uso,
    solicita_ayuda: String(state.solicita_ayuda),
  });

  if (state.tipo_instalacion === "irve") {
    params.set("numero_puntos", state.numero_puntos);
    params.set("potencia_por_punto_kw", state.potencia_por_punto_kw);
    params.set("modo_recarga", state.modo_recarga);
    params.set("acceso_publico", String(state.acceso_publico));
    params.set("ubicacion_irve", state.ubicacion_irve);
    params.set("requiere_nuevo_suministro", String(state.requiere_nuevo_suministro));
  }

  if (state.tipo_instalacion === "gas_baja_presion") {
    params.set("combustible", state.combustible);
    params.set("presion_bar", state.presion_bar);
  }

  return `/expedientes/nuevo?${params.toString()}`;
}
