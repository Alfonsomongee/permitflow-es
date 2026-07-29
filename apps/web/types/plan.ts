// El motor normativo (fuera de Andalucía) usa nombres de plataforma en texto
// libre por comunidad (ej. "SIRECYL", "Sede Electrónica del Gobierno de Aragón"),
// así que el tipo no puede ser un enum cerrado.
export type Plataforma = string | null;

export interface DocumentoRequerido {
  id: string;
  label: string;
  descripcion: string;
  obligatorio: boolean;
}

export interface Tramite {
  orden: number;
  nombre: string;
  tipo_actuacion?: "accion_usuario" | "oficio_administracion" | "informativa" | "revision_manual";
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

export type NivelVerificacionPlan =
  | "verificada"
  | "verificada_parcialmente"
  | "verificado_con_observaciones"
  | "en_revision"
  | "borrador_verificado_parcialmente"
  | "generica";

export interface PlanTramitacion {
  tramites: Tramite[];
  tiempo_total_estimado_dias: number | null;
  advertencias: string[];
  nivel_verificacion?: NivelVerificacionPlan;
  /** Campo de auditoría interno del JSON de normativa (más granular que
   * nivel_verificacion; puede indicar mayor severidad, ej. "borrador_no_verificado"). */
  estado?: string | null;
  /** Nota de auditoría en texto libre sobre el estado de verificación, si existe. */
  aviso?: string | null;
  /** Huecos de verificación documentados (tasas, umbrales, trámites sin confirmar...). */
  huecos_verificacion?: string[];
}

/** Compara nivel_verificacion (enum cerrado) y estado (texto libre de auditoría,
 * más granular) y devuelve la severidad real a mostrar al usuario. estado prima
 * porque refleja el diagnóstico de la última auditoría de contenido, que puede
 * ser más grave que el nivel_verificacion general del fichero. */
export function severidadVerificacion(plan: PlanTramitacion): {
  nivel: "critico" | "atencion" | "ninguno";
  etiqueta: string;
} {
  const estado = plan.estado ?? "";
  if (estado.includes("no_verificado")) {
    return { nivel: "critico", etiqueta: "Borrador no verificado" };
  }
  if (plan.nivel_verificacion === "generica") {
    return { nivel: "critico", etiqueta: "Normativa genérica (sin verificación autonómica)" };
  }
  if (
    estado.includes("parcial") ||
    plan.nivel_verificacion === "verificada_parcialmente" ||
    plan.nivel_verificacion === "verificado_con_observaciones" ||
    plan.nivel_verificacion === "en_revision" ||
    plan.nivel_verificacion === "borrador_verificado_parcialmente"
  ) {
    return { nivel: "atencion", etiqueta: "Verificado con observaciones" };
  }
  return { nivel: "ninguno", etiqueta: "Verificado" };
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
  potencia_kw: number;
  uso?: string;
  numero_puntos?: number;
  modo_recarga?: string;
  acceso_publico?: boolean;
  ubicacion_irve?: string;
  solicita_ayuda?: boolean;
  tension?: string;
  nivel_tension_consumidor?: string;
  nivel_tension_generacion?: string;
  nivel_tension_conexion?: string;
  modalidad_autoconsumo?: string;
  combustible?: string;
  presion_bar?: string;
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
