// Tipos que reflejan exactamente el ClasificadorOutput del backend (schemas/clasificador.py)

export type Plataforma = "PUES" | "TECI" | "MITECO" | "distribuidora" | "ayuntamiento" | null;

export interface Tramite {
  orden: number;
  nombre: string;
  organismo: string;
  base_legal: string;
  plazo_estimado_dias: number | null;
  documentos_requeridos: string[];
  notas: string | null;
  plataforma: Plataforma;
  plazo_legal_dias: number | null;
  coste_estimado: string | null;
}

export interface PlanTramitacion {
  tramites: Tramite[];
  tiempo_total_estimado_dias: number | null;
  advertencias: string[];
}

// Parámetros de entrada que se muestran en el resumen lateral
export interface InstalacionParams {
  tipo_instalacion: string;
  comunidad: string;
  municipio: string;
  potencia_kw: number;
  uso?: string;
  // Campos opcionales por vertical
  numero_puntos?: number;
  modo_recarga?: string;
  acceso_publico?: boolean;
  ubicacion_irve?: string;
  solicita_ayuda?: boolean;
}

// Labels legibles para mostrar en la UI
export const TIPO_LABEL: Record<string, string> = {
  fotovoltaica_autoconsumo: "Fotovoltaica autoconsumo",
  climatizacion_aerotermia: "Climatización y aerotermia",
  acs: "Agua caliente sanitaria (ACS)",
  gas_baja_presion: "Gas baja presión",
  irve: "Recarga de vehículo eléctrico (IRVE)",
};

export const COMUNIDAD_LABEL: Record<string, string> = {
  andalucia: "Andalucía",
  aragon: "Aragón",
  asturias: "Asturias",
  baleares: "Baleares",
  canarias: "Canarias",
  cantabria: "Cantabria",
  castilla_la_mancha: "Castilla-La Mancha",
  castilla_leon: "Castilla y León",
  cataluna: "Cataluña",
  comunidad_valenciana: "C. Valenciana",
  extremadura: "Extremadura",
  galicia: "Galicia",
  la_rioja: "La Rioja",
  madrid: "Madrid",
  murcia: "Murcia",
  navarra: "Navarra",
  pais_vasco: "País Vasco",
};

export const PLATAFORMA_LABEL: Record<string, string> = {
  PUES: "PUES",
  TECI: "TECI",
  MITECO: "MITECO",
  distribuidora: "Distribuidora",
  ayuntamiento: "Ayuntamiento",
};

export const DOCUMENTO_LABEL: Record<string, string> = {
  memoria_tecnica_diseno_itc_bt_52: "Memoria técnica de diseño ITC-BT-52",
  esquema_unifilar_conexion_elegido: "Esquema unifilar de conexión",
  datos_titular: "Datos del titular",
  datos_instalador: "Datos del instalador",
  potencia_prevista: "Potencia prevista",
  identificacion_puntos_recarga: "Identificación de puntos de recarga",
  certificado_instalacion_electrica: "Certificado de instalación eléctrica (CIE)",
  carnet_instalador_electricista: "Carné de instalador electricista",
  justificante_pago_tasas: "Justificante de pago de tasas",
  dni_nie_titular: "DNI/NIE del titular",
};

/** Devuelve un label legible para cualquier key de documento,
 *  o formatea el snake_case si no está en el diccionario */
export function formatDocLabel(key: string): string {
  return (
    DOCUMENTO_LABEL[key] ??
    key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}
