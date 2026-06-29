// Tipos del módulo de expedientes

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
  fecha_creacion: string;   // ISO
  fecha_actualizacion: string; // ISO
  cliente?: string;
}

export const ESTADO_LABEL: Record<EstadoExpediente, string> = {
  borrador:     "Borrador",
  pendiente:    "Pendiente",
  en_revision:  "En revisión",
  aprobado:     "Aprobado",
  rechazado:    "Rechazado",
};

export const ESTADO_STYLES: Record<
  EstadoExpediente,
  { bg: string; text: string; dot: string }
> = {
  borrador:    { bg: "bg-neutral-100",   text: "text-neutral-600",   dot: "bg-neutral-400"  },
  pendiente:   { bg: "bg-warning-light", text: "text-warning-dark",  dot: "bg-warning"      },
  en_revision: { bg: "bg-primary-light", text: "text-primary-dark",  dot: "bg-primary"      },
  aprobado:    { bg: "bg-success-light", text: "text-success-dark",  dot: "bg-success"      },
  rechazado:   { bg: "bg-danger-light",  text: "text-danger-dark",   dot: "bg-danger"       },
};

export const TIPO_LABEL: Record<string, string> = {
  fotovoltaica_autoconsumo: "Fotovoltaica",
  irve:                     "IRVE",
  climatizacion_aerotermia: "Climatización",
  acs:                      "ACS",
  gas_baja_presion:         "Gas BP",
};

export const COMUNIDAD_LABEL: Record<string, string> = {
  andalucia:            "Andalucía",
  aragon:               "Aragón",
  cataluna:             "Cataluña",
  madrid:               "Madrid",
  comunidad_valenciana: "C. Valenciana",
  pais_vasco:           "País Vasco",
};

// Datos mock para el prototipo (reemplazar por fetch a API cuando haya auth)
export const EXPEDIENTES_MOCK: Expediente[] = [
  {
    id: "exp-001",
    tipo_instalacion: "irve",
    comunidad: "andalucia",
    municipio: "Sevilla",
    potencia_kw: 22,
    estado: "en_revision",
    tramites_total: 4,
    tramites_completados: 2,
    fecha_creacion: "2026-06-25T10:00:00Z",
    fecha_actualizacion: "2026-06-29T08:30:00Z",
    cliente: "C/ Betis 14",
  },
  {
    id: "exp-002",
    tipo_instalacion: "fotovoltaica_autoconsumo",
    comunidad: "andalucia",
    municipio: "Córdoba",
    potencia_kw: 9.9,
    estado: "pendiente",
    tramites_total: 5,
    tramites_completados: 0,
    fecha_creacion: "2026-06-24T14:00:00Z",
    fecha_actualizacion: "2026-06-28T16:00:00Z",
    cliente: "Polígono Sur",
  },
  {
    id: "exp-003",
    tipo_instalacion: "acs",
    comunidad: "andalucia",
    municipio: "Málaga",
    potencia_kw: 6,
    estado: "aprobado",
    tramites_total: 3,
    tramites_completados: 3,
    fecha_creacion: "2026-06-10T09:00:00Z",
    fecha_actualizacion: "2026-06-20T11:00:00Z",
    cliente: "Residencial Albero",
  },
  {
    id: "exp-004",
    tipo_instalacion: "fotovoltaica_autoconsumo",
    comunidad: "cataluna",
    municipio: "Barcelona",
    potencia_kw: 15,
    estado: "pendiente",
    tramites_total: 4,
    tramites_completados: 1,
    fecha_creacion: "2026-06-12T11:00:00Z",
    fecha_actualizacion: "2026-06-26T09:00:00Z",
    cliente: "C/ Balmes 88",
  },
  {
    id: "exp-005",
    tipo_instalacion: "gas_baja_presion",
    comunidad: "aragon",
    municipio: "Zaragoza",
    potencia_kw: 30,
    estado: "aprobado",
    tramites_total: 4,
    tramites_completados: 4,
    fecha_creacion: "2026-06-01T08:00:00Z",
    fecha_actualizacion: "2026-06-18T14:00:00Z",
    cliente: "Nave logística",
  },
  {
    id: "exp-006",
    tipo_instalacion: "climatizacion_aerotermia",
    comunidad: "madrid",
    municipio: "Madrid",
    potencia_kw: 12,
    estado: "borrador",
    tramites_total: 6,
    tramites_completados: 0,
    fecha_creacion: "2026-06-29T07:00:00Z",
    fecha_actualizacion: "2026-06-29T07:00:00Z",
    cliente: "Edificio Castellana",
  },
];
