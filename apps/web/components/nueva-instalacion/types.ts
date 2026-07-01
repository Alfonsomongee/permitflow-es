// Full form state matching the backend ClasificadorInput shape.

export interface FormState {
  // Step 1: type and location
  tipo_instalacion: string;
  comunidad: string;
  municipio: string;
  uso: string;

  // Step 2: technical parameters by vertical
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

  // Step 3: grants
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
    label: "Tipo y ubicacion",
    description: (s) =>
      s.tipo_instalacion && s.comunidad
        ? `${TIPO_LABEL[s.tipo_instalacion] ?? s.tipo_instalacion} - ${COMUNIDAD_LABEL[s.comunidad] ?? s.comunidad}`
        : "Selecciona el tipo de instalacion",
  },
  {
    id: 2,
    label: "Parametros tecnicos",
    description: (s) =>
      s.potencia_kw ? `${s.potencia_kw} kW` : "Potencia y caracteristicas",
  },
  {
    id: 3,
    label: "Ayudas y subvenciones",
    description: () => "MOVES III, Next Gen EU",
  },
];

export const TIPO_OPTIONS = [
  { value: "fotovoltaica_autoconsumo", label: "Fotovoltaica autoconsumo" },
  { value: "irve", label: "Recarga de vehiculo electrico (IRVE)" },
  { value: "climatizacion_aerotermia", label: "Climatizacion y aerotermia" },
  { value: "acs", label: "Agua caliente sanitaria (ACS)" },
  { value: "gas_baja_presion", label: "Gas baja presion" },
];

export const COMUNIDAD_OPTIONS = [
  { value: "andalucia", label: "Andalucia" },
  { value: "aragon", label: "Aragon" },
  { value: "asturias", label: "Asturias" },
  { value: "baleares", label: "Baleares" },
  { value: "canarias", label: "Canarias" },
  { value: "cantabria", label: "Cantabria" },
  { value: "castilla_la_mancha", label: "Castilla-La Mancha" },
  { value: "castilla_leon", label: "Castilla y Leon" },
  { value: "cataluna", label: "Cataluna" },
  { value: "comunidad_valenciana", label: "C. Valenciana" },
  { value: "extremadura", label: "Extremadura" },
  { value: "galicia", label: "Galicia" },
  { value: "la_rioja", label: "La Rioja" },
  { value: "madrid", label: "Madrid" },
  { value: "murcia", label: "Murcia" },
  { value: "navarra", label: "Navarra" },
  { value: "pais_vasco", label: "Pais Vasco" },
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

export const VERTICALES_ANDALUCIA = new Set([
  "fotovoltaica_autoconsumo",
  "irve",
  "climatizacion_aerotermia",
  "acs",
  "gas_baja_presion",
]);

export function tieneCobertura(tipo: string, comunidad: string): boolean {
  if (comunidad === "andalucia") return VERTICALES_ANDALUCIA.has(tipo);
  return tipo === "fotovoltaica_autoconsumo";
}
