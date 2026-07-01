export type EstadoExpediente =
  | "borrador"
  | "pendiente"
  | "en_revision"
  | "aprobado"
  | "rechazado";

export interface Expediente {
  id: string;
  tipo_instalacion: string;
  comunidad: string;
  municipio: string;
  potencia_kw: number;
  estado: EstadoExpediente;
  tramites_total: number;
  tramites_completados: number;
  fecha_creacion: string;
  fecha_actualizacion: string;
  cliente?: string;
}

export const ESTADO_LABEL: Record<EstadoExpediente, string> = {
  borrador: "Borrador",
  pendiente: "Pendiente",
  en_revision: "En revision",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

export const ESTADO_STYLES: Record<
  EstadoExpediente,
  { bg: string; text: string; dot: string }
> = {
  borrador: { bg: "bg-neutral-100", text: "text-neutral-600", dot: "bg-neutral-400" },
  pendiente: { bg: "bg-warning-light", text: "text-warning-dark", dot: "bg-warning" },
  en_revision: { bg: "bg-primary-light", text: "text-primary-dark", dot: "bg-primary" },
  aprobado: { bg: "bg-success-light", text: "text-success-dark", dot: "bg-success" },
  rechazado: { bg: "bg-danger-light", text: "text-danger-dark", dot: "bg-danger" },
};

export const TIPO_LABEL: Record<string, string> = {
  fotovoltaica_autoconsumo: "Fotovoltaica",
  irve: "IRVE",
  climatizacion_aerotermia: "Climatizacion",
  acs: "ACS",
  gas_baja_presion: "Gas BP",
};

export const COMUNIDAD_LABEL: Record<string, string> = {
  andalucia: "Andalucia",
  aragon: "Aragon",
  asturias: "Asturias",
  baleares: "Baleares",
  canarias: "Canarias",
  cantabria: "Cantabria",
  castilla_la_mancha: "Castilla-La Mancha",
  castilla_leon: "Castilla y Leon",
  cataluna: "Cataluna",
  comunidad_valenciana: "C. Valenciana",
  extremadura: "Extremadura",
  galicia: "Galicia",
  la_rioja: "La Rioja",
  madrid: "Madrid",
  murcia: "Murcia",
  navarra: "Navarra",
  pais_vasco: "Pais Vasco",
};
