export type Plataforma =
  | "PUES"
  | "TECI"
  | "MITECO"
  | "distribuidora"
  | "ayuntamiento"
  | null;

export interface DocumentoRequerido {
  id: string;
  label: string;
  descripcion: string;
  obligatorio: boolean;
}

export interface Tramite {
  orden: number;
  nombre: string;
  organismo: string;
  base_legal: string;
  plazo_estimado_dias: number | null;
  plazo_legal_dias: number | null;
  documentos_requeridos: DocumentoRequerido[];
  notas: string | null;
  plataforma: Plataforma;
  plataforma_url: string | null;
  coste_estimado: string | null;
  formulario_ref?: string | null;
  paralelo_con?: number | null;
  regla_id?: string | null;
}

export interface EstadisticaPlazo {
  claveTramite: string;
  nombreTramite: string;
  plazoLegalDias: number | null;
  muestraN: number;
  mediaRealDias: number;
  medianaRealDias: number;
}

export interface HallazgoValidacion {
  id: string;
  severidad: "error" | "aviso";
  mensaje: string;
  fuente: string | null;
}

export interface ValidacionResultado {
  hallazgos: HallazgoValidacion[];
  total_errores: number;
  total_avisos: number;
  total_definidas: number;
  no_evaluables: string[];
}

export interface PlanTramitacion {
  tramites: Tramite[];
  tiempo_total_estimado_dias: number | null;
  advertencias: string[];
  nivel_verificacion?: "verificada" | "generica";
}

export type TramiteEstado = "pendiente" | "en_curso" | "completado";

export interface TramiteEstadoInfo {
  estado: TramiteEstado;
  /** Fecha ISO (YYYY-MM-DD) en que se inició/presentó el trámite */
  fecha_inicio: string | null;
  /** Fecha ISO (YYYY-MM-DD) de resolución */
  fecha_completado: string | null;
}

/** Clave: orden del trámite como string (las claves JSON son strings) */
export type TramitesEstadoMap = Record<string, TramiteEstadoInfo>;

export interface InstalacionParams {
  tipo_instalacion: string;
  comunidad: string;
  municipio: string;
  potencia_kw: number;
  uso?: string;
  numero_puntos?: number;
  modo_recarga?: string;
  acceso_publico?: boolean;
  ubicacion_irve?: string;
  solicita_ayuda?: boolean;
}

export const TIPO_LABEL: Record<string, string> = {
  fotovoltaica_autoconsumo: "Fotovoltaica autoconsumo",
  climatizacion_aerotermia: "Climatizacion y aerotermia",
  acs: "Agua caliente sanitaria (ACS)",
  gas_baja_presion: "Gas baja presion",
  irve: "Recarga de vehiculo electrico (IRVE)",
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

export const PLATAFORMA_LABEL: Record<string, string> = {
  PUES: "PUES",
  TECI: "TECI",
  MITECO: "MITECO",
  distribuidora: "Distribuidora",
  ayuntamiento: "Ayuntamiento",
};

export const DOCUMENTO_LABEL: Record<string, string> = {
  memoria_tecnica_diseno_itc_bt_52: "Memoria tecnica de diseno ITC-BT-52",
  esquema_unifilar_conexion_elegido: "Esquema unifilar de conexion",
  datos_titular: "Datos del titular",
  datos_instalador: "Datos del instalador",
  potencia_prevista: "Potencia prevista",
  identificacion_puntos_recarga: "Identificacion de puntos de recarga",
  certificado_instalacion_electrica: "Certificado de instalacion electrica (CIE)",
  carnet_instalador_electricista: "Carne de instalador electricista",
  justificante_pago_tasas: "Justificante de pago de tasas",
  dni_nie_titular: "DNI/NIE del titular",
};

export function formatDocLabel(key: string): string {
  return (
    DOCUMENTO_LABEL[key] ??
    key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
}
