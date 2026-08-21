import {
  severidadDeVerificacion,
  type ResultadoVerificacion,
} from "@/lib/verificacion";

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
  /** Registro de salida de la instalación (ej. "RITSIC"). Lo emite el backend
   * desde 2026 pero faltaba en este tipo, así que no se renderizaba en ningún
   * sitio (auditoría QA 2026-08-11, B-01). */
  registro_salida?: string | null;
  /** Medio de presentación exigido (ej. "electronico_obligatorio"). */
  medio_presentacion?: string | null;
  paralelo_con?: number | null;
  regla_id?: string | null;
  /** Efecto del silencio administrativo (Ley 39/2015, art. 24) si el
   * organismo no resuelve dentro de plazo_legal_dias. null/ausente si no
   * está verificado para este trámite concreto (no implica que no aplique
   * -- ver schemas/clasificador.py::SilencioAdministrativo). */
  silencio_administrativo?: "positivo" | "negativo" | null;
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
  /** Indicador cualitativo de riesgo por trámite (no es una probabilidad de rechazo:
   * no hay histórico de motivos de rechazo con el que entrenar un modelo predictivo).
   * Combina la severidad de verificación de la normativa con la completitud de cada
   * trámite (base legal, plazo legal, documentos requeridos). */
  riesgo_normativo?: RiesgoNormativoPlan | null;
}

export type NivelRiesgo = "bajo" | "medio" | "alto";

export interface RiesgoTramite {
  orden: number;
  nombre: string;
  riesgo: NivelRiesgo;
  motivos: string[];
}

export interface RiesgoNormativoPlan {
  severidad_normativa: "critico" | "atencion" | "verificada";
  tramites: RiesgoTramite[];
  resumen: Record<NivelRiesgo, number>;
  hay_riesgo_alto: boolean;
}

/** Severidad de verificación del plan, a partir del criterio único de
 * lib/verificacion.ts. Antes esta función duplicaba esa lógica con el orden de
 * los condicionales invertido respecto al aviso del paso 1 del formulario, y
 * las dos fases se contradecían en 9 combinaciones (auditoría QA 2026-08-11,
 * A-01). */
export function severidadVerificacion(plan: PlanTramitacion): ResultadoVerificacion {
  return severidadDeVerificacion(plan.nivel_verificacion, plan.estado);
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

export function formatDocLabel(key: string): string {
  return (
    DOCUMENTO_LABEL[key] ??
    key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
}
