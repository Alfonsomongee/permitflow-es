// Full form state matching the backend ClasificadorInput shape.
import type { NuevaInstalacionFormData } from "../../lib/validations/nuevaInstalacion";
import { COBERTURA_NORMATIVA } from "@/content/cobertura_normativa";
import { severidadDeVerificacion } from "@/lib/verificacion";

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
  // Vacio a proposito (antes precargaba "garaje_comunitario", la rama con mas
  // campos derivados): si el usuario no toca el selector, no debe enviarse
  // como si hubiera elegido la rama mas compleja sin darse cuenta (auditoria
  // motor normativo 2026-08-19). Ahora el superRefine de nuevaInstalacion.ts
  // exige que se elija activamente.
  ubicacion_irve: "",
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
  uso_colectivo: undefined,
  acumulacion: undefined,
  recirculacion: undefined,
  incluida_ambito_rd_487_2022: undefined,
  instalacion_origen_modificada: undefined,
  implantacion: "",
  clase_instalacion_gas: "",
  requiere_registro_produccion: undefined,
  numero_suministros_edificio: "",
  tipo_generador_acs: "",
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
        ? `${TIPO_LABEL[s.tipo_instalacion] ?? s.tipo_instalacion} - ${COMUNIDAD_LABEL[s.comunidad] ?? s.comunidad}`
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
    description: () => "MOVES III, Next Gen EU",
  },
];

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

/**
 * Nivel de cobertura normativa REAL para el aviso del selector, derivado del
 * mismo dato que usa el motor (content/cobertura_normativa.ts, generado desde
 * apps/api/motor_normativo/reglas/*.json). Antes este selector usaba un
 * conjunto fijo ("solo Andalucía completa, resto solo fotovoltaica") que ya no
 * reflejaba la realidad: las 17 CCAA x 5 verticales tienen reglas, pero con
 * niveles de verificación muy distintos.
 */
export type NivelCobertura = "verificada" | "atencion" | "generica_grave";

/** Aviso previo del selector, derivado del MISMO criterio que el banner del
 * plan (lib/verificacion.ts). Antes esta función replicaba esa lógica con el
 * orden de los condicionales invertido, así que Aragón y Asturias se
 * anunciaban aquí como "verificado parcialmente" y en el plan resultante como
 * "normativa genérica sin verificar" (auditoría QA 2026-08-11, A-01). */
export function nivelCobertura(tipo: string, comunidad: string): NivelCobertura {
  const combo = COBERTURA_NORMATIVA[comunidad]?.[tipo];
  if (!combo) return "generica_grave";

  const { nivel } = severidadDeVerificacion(combo.nivelVerificacion, combo.estado);
  if (nivel === "critico") return "generica_grave";
  if (nivel === "atencion") return "atencion";
  return "verificada";
}

// tieneCobertura() se ha eliminado (auditoría QA 2026-08-11, B-05). Estaba
// marcada @deprecated, no tenía ningún uso en el código, y devolvía true solo
// para Andalucía/ACS: si alguien la hubiera usado como puerta de acceso habría
// bloqueado 84 de las 85 combinaciones. Usa nivelCobertura().
