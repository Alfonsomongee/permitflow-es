// Full form state matching the backend ClasificadorInput shape.
import type { NuevaInstalacionFormData } from "../../lib/validations/nuevaInstalacion";
import { COBERTURA_NORMATIVA } from "@/content/cobertura_normativa";

export type FormState = NuevaInstalacionFormData;

export const FORM_INITIAL: FormState = {
  tipo_instalacion: "fotovoltaica_autoconsumo",
  comunidad: "andalucia",
  referencia_cliente: "",
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
  tension: "",
  nivel_tension_consumidor: "",
  nivel_tension_generacion: "",
  nivel_tension_conexion: "",
  modalidad_autoconsumo: "",
  ubicacion_suelo: "",
  requiere_acceso_conexion: undefined,
  inversion_eur: "",
  potencia_resultante_kw: "",
  presion_resultante_bar: "",
  es_ampliacion: false,
  incremento_potencia_pct: "",
  uso_edificio: "",
  ventilacion_garaje: "",
  numero_plazas_garaje: "",
  garaje_existente: undefined,
  acs_centralizada: undefined,
  incluida_ambito_legionella: undefined,
  dispone_acumulacion: undefined,
  dispone_circuito_retorno: undefined,
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

/**
 * Nivel de cobertura normativa REAL para el aviso del selector, derivado del
 * mismo dato que usa el motor (content/cobertura_normativa.ts, generado desde
 * apps/api/motor_normativo/reglas/*.json). Antes este selector usaba un
 * conjunto fijo ("solo Andalucía completa, resto solo fotovoltaica") que ya no
 * reflejaba la realidad: las 17 CCAA x 5 verticales tienen reglas, pero con
 * niveles de verificación muy distintos.
 */
export type NivelCobertura = "verificada" | "atencion" | "generica_grave";

export function nivelCobertura(tipo: string, comunidad: string): NivelCobertura {
  const combo = COBERTURA_NORMATIVA[comunidad]?.[tipo];
  if (!combo) return "generica_grave";

  const estado = combo.estado ?? "";
  if (estado.includes("no_verificado")) return "generica_grave";
  if (combo.nivelVerificacion === "verificada" && !estado) return "verificada";
  if (
    estado.includes("parcial") ||
    combo.nivelVerificacion === "verificada_parcialmente" ||
    combo.nivelVerificacion === "verificado_con_observaciones" ||
    combo.nivelVerificacion === "en_revision" ||
    combo.nivelVerificacion === "borrador_verificado_parcialmente"
  ) {
    return "atencion";
  }
  return "generica_grave";
}

/** @deprecated usa nivelCobertura() — se mantiene para no romper otros usos existentes. */
export function tieneCobertura(tipo: string, comunidad: string): boolean {
  return nivelCobertura(tipo, comunidad) === "verificada";
}
