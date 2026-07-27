export interface SupuestoUtilizado {
  parametro: string;
  valor_asumido: string | number;
  razon: string;
}

export interface Incentivo {
  nombre: string;
  descripcion: string;
  ahorro_estimado: number;
  nivel_verificacion: 'exacta_factura' | 'estimada_datos' | 'generica_pendiente_url';
  fuente?: string;
}

export interface EscenarioAhorro {
  nombre: string;
  coste_inicial: number;
  ahorro_anual: number;
  tiempo_retorno_anios: number;
  produccion_anual_estimada_kwh?: number;
}

export interface InformeSimulacionIA {
  supuestos_utilizados: SupuestoUtilizado[];
  incentivos_fiscales: Incentivo[];
  escenarios: EscenarioAhorro[];
  recomendacion_final: string;
}
