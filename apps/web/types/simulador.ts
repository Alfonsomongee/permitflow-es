// Tipos compartidos para el Simulador de Ahorro.
// Fuente de verdad: apps/api/servicios/informes_ia.py (InformeSimulacionIA y clases anidadas).
// Alineados manualmente hasta que openapi-typescript esté activo en postinstall.

export interface SupuestoUtilizado {
  parametro: string;
  valor_asumido: string | number;
  razon: string;
  fuente_dato?: 'leido' | 'estimado';
}

export interface Incentivo {
  nombre: string;
  descripcion: string;
  ahorro_estimado: number;
  nivel_verificacion: 'verificada' | 'generica_pendiente_url';
  fuente?: string;
}

export interface EscenarioAhorro {
  nombre: string;
  potencia_kwp: number;
  coste_inicial: number;
  ahorro_anual: number;
  ahorro_5_anios: number;
  ahorro_10_anios: number;
}

export interface InformeSimulacionIA {
  supuestos_utilizados: SupuestoUtilizado[];
  incentivos_fiscales: Incentivo[];
  escenarios: EscenarioAhorro[];
  recomendacion_final: string;
}

// Respuesta del endpoint POST /simulador/generar
export interface GenerarResponse {
  estudio_id: string;
  estado: 'pendiente' | 'completado' | 'error';
  token: string; // HMAC firmado, enviar en cabecera X-Estudio-Token
}

// Respuesta del endpoint GET /simulador/estudio/{id}
export interface EstudioResponse {
  estudio_id: string;
  estado: 'pendiente' | 'completado' | 'error';
  resultado: InformeSimulacionIA | null;
}

// Respuesta del endpoint POST /simulador/factura
export interface FacturaResponse {
  id: string;
  estado: 'exitoso' | 'no_extraido';
  cups_masked: string | null;
  consumo_anual_kwh: number | null;
  potencia_contratada_kw: number | null;
  fuente_dato: 'leido' | 'estimado' | null;
  extraccion_fuente: {
    cups: 'regex' | 'llm';
    consumo: 'regex' | 'llm';
    potencia: 'regex' | 'llm';
  } | null;
  error?: string;
}
