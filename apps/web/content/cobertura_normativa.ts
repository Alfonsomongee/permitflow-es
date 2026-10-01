// GENERADO desde apps/api/motor_normativo/reglas/*/*.json — no editar a mano.
// Regenerar con: python3 scripts/generar_cobertura_normativa.py
// Refleja el nivel de verificación real de cada combinación comunidad x tecnología,
// para que el selector de "Nueva instalación" no muestre un aviso binario desconectado
// del contenido real del motor normativo.

export interface CoberturaCombo {
  nivelVerificacion: string;
  estado: string | null;
  huecos: number;
  /** Fecha (ISO) de la última revisión de contenido del fichero de reglas. */
  ultimaRevision: string | null;
  /** Persona que revisó el contenido; null = sin revisor humano identificado. */
  revisadoPor: string | null;
}

export const COBERTURA_NORMATIVA: Record<string, Record<string, CoberturaCombo>> = {
  andalucia: {
    acs: { nivelVerificacion: "verificada", estado: null, huecos: 5, ultimaRevision: "2026-07-28", revisadoPor: null },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: null, huecos: 3, ultimaRevision: "2026-07-28", revisadoPor: null },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: null, huecos: 6, ultimaRevision: "2026-08-09", revisadoPor: null },
    gas_baja_presion: { nivelVerificacion: "generica", estado: null, huecos: 2, ultimaRevision: "2026-07-28", revisadoPor: null },
    irve: { nivelVerificacion: "generica", estado: null, huecos: 3, ultimaRevision: "2026-07-28", revisadoPor: null },
  },
  aragon: {
    acs: { nivelVerificacion: "generica", estado: "verificado_parcialmente", huecos: 6, ultimaRevision: "2026-07-28", revisadoPor: null },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: "verificado_parcialmente", huecos: 5, ultimaRevision: "2026-07-28", revisadoPor: null },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 7, ultimaRevision: "2026-07-28", revisadoPor: null },
    gas_baja_presion: { nivelVerificacion: "generica", estado: "verificado_parcialmente", huecos: 7, ultimaRevision: "2026-07-28", revisadoPor: null },
    irve: { nivelVerificacion: "generica", estado: "verificado_parcialmente", huecos: 4, ultimaRevision: "2026-07-28", revisadoPor: null },
  },
  asturias: {
    acs: { nivelVerificacion: "generica", estado: "verificado_parcialmente", huecos: 2, ultimaRevision: "2026-07-28", revisadoPor: null },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: "verificado_parcialmente", huecos: 1, ultimaRevision: "2026-07-28", revisadoPor: null },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: "verificado_parcialmente", huecos: 4, ultimaRevision: "2026-07-28", revisadoPor: null },
    gas_baja_presion: { nivelVerificacion: "generica", estado: "verificado_parcialmente", huecos: 2, ultimaRevision: "2026-07-28", revisadoPor: null },
    irve: { nivelVerificacion: "generica", estado: "verificado_parcialmente", huecos: 4, ultimaRevision: "2026-07-28", revisadoPor: null },
  },
  baleares: {
    acs: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4, ultimaRevision: "2026-07-28", revisadoPor: null },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5, ultimaRevision: "2026-07-28", revisadoPor: null },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5, ultimaRevision: "2026-07-28", revisadoPor: null },
    gas_baja_presion: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5, ultimaRevision: "2026-07-28", revisadoPor: null },
    irve: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4, ultimaRevision: "2026-07-28", revisadoPor: null },
  },
  canarias: {
    acs: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5, ultimaRevision: "2026-07-28", revisadoPor: null },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4, ultimaRevision: "2026-07-28", revisadoPor: null },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 11, ultimaRevision: "2026-07-28", revisadoPor: null },
    gas_baja_presion: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 6, ultimaRevision: "2026-07-28", revisadoPor: null },
    irve: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5, ultimaRevision: "2026-07-28", revisadoPor: null },
  },
  cantabria: {
    acs: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5, ultimaRevision: "2026-07-28", revisadoPor: null },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 3, ultimaRevision: "2026-07-28", revisadoPor: null },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 6, ultimaRevision: "2026-07-28", revisadoPor: null },
    gas_baja_presion: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 3, ultimaRevision: "2026-07-28", revisadoPor: null },
    irve: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5, ultimaRevision: "2026-07-26", revisadoPor: null },
  },
  castilla_la_mancha: {
    acs: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5, ultimaRevision: "2026-07-28", revisadoPor: null },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4, ultimaRevision: "2026-07-28", revisadoPor: null },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4, ultimaRevision: "2026-07-28", revisadoPor: null },
    gas_baja_presion: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4, ultimaRevision: "2026-07-28", revisadoPor: null },
    irve: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4, ultimaRevision: "2026-07-28", revisadoPor: null },
  },
  castilla_leon: {
    acs: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4, ultimaRevision: "2026-07-28", revisadoPor: null },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 3, ultimaRevision: "2026-07-28", revisadoPor: null },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4, ultimaRevision: "2026-07-28", revisadoPor: null },
    gas_baja_presion: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4, ultimaRevision: "2026-07-28", revisadoPor: null },
    irve: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4, ultimaRevision: "2026-07-28", revisadoPor: null },
  },
  cataluna: {
    acs: { nivelVerificacion: "verificada_parcialmente", estado: "verificado_con_observaciones", huecos: 6, ultimaRevision: "2026-10-01", revisadoPor: null },
    climatizacion_aerotermia: { nivelVerificacion: "verificada_parcialmente", estado: "verificado_con_observaciones", huecos: 5, ultimaRevision: "2026-10-01", revisadoPor: null },
    fotovoltaica_autoconsumo: { nivelVerificacion: "en_revision", estado: "borrador_verificado_parcialmente", huecos: 10, ultimaRevision: "2026-10-01", revisadoPor: null },
    gas_baja_presion: { nivelVerificacion: "verificada_parcialmente", estado: "verificado_con_observaciones", huecos: 4, ultimaRevision: "2026-10-01", revisadoPor: null },
    irve: { nivelVerificacion: "verificada_parcialmente", estado: "verificado_con_observaciones", huecos: 5, ultimaRevision: "2026-10-01", revisadoPor: null },
  },
  comunidad_valenciana: {
    acs: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5, ultimaRevision: "2026-07-28", revisadoPor: null },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4, ultimaRevision: "2026-07-28", revisadoPor: null },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 3, ultimaRevision: "2026-07-28", revisadoPor: null },
    gas_baja_presion: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4, ultimaRevision: "2026-07-28", revisadoPor: null },
    irve: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4, ultimaRevision: "2026-07-28", revisadoPor: null },
  },
  extremadura: {
    acs: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 3, ultimaRevision: "2026-07-28", revisadoPor: null },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 2, ultimaRevision: "2026-07-28", revisadoPor: null },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 2, ultimaRevision: "2026-07-28", revisadoPor: null },
    gas_baja_presion: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 3, ultimaRevision: "2026-07-28", revisadoPor: null },
    irve: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4, ultimaRevision: "2026-07-28", revisadoPor: null },
  },
  galicia: {
    acs: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5, ultimaRevision: "2026-07-28", revisadoPor: null },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5, ultimaRevision: "2026-07-28", revisadoPor: null },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5, ultimaRevision: "2026-07-28", revisadoPor: null },
    gas_baja_presion: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4, ultimaRevision: "2026-07-28", revisadoPor: null },
    irve: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 6, ultimaRevision: "2026-07-28", revisadoPor: null },
  },
  la_rioja: {
    acs: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 6, ultimaRevision: "2026-07-28", revisadoPor: null },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5, ultimaRevision: "2026-07-28", revisadoPor: null },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4, ultimaRevision: "2026-07-27", revisadoPor: null },
    gas_baja_presion: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4, ultimaRevision: "2026-07-28", revisadoPor: null },
    irve: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4, ultimaRevision: "2026-07-27", revisadoPor: null },
  },
  madrid: {
    acs: { nivelVerificacion: "verificada_parcialmente", estado: "verificado_con_observaciones", huecos: 6, ultimaRevision: "2026-10-01", revisadoPor: null },
    climatizacion_aerotermia: { nivelVerificacion: "verificada_parcialmente", estado: "verificado_con_observaciones", huecos: 4, ultimaRevision: "2026-10-01", revisadoPor: null },
    fotovoltaica_autoconsumo: { nivelVerificacion: "verificada_parcialmente", estado: "verificado_con_observaciones", huecos: 6, ultimaRevision: "2026-10-01", revisadoPor: null },
    gas_baja_presion: { nivelVerificacion: "verificada_parcialmente", estado: "verificado_con_observaciones", huecos: 5, ultimaRevision: "2026-10-01", revisadoPor: null },
    irve: { nivelVerificacion: "verificada_parcialmente", estado: "verificado_con_observaciones", huecos: 5, ultimaRevision: "2026-10-01", revisadoPor: null },
  },
  murcia: {
    acs: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4, ultimaRevision: "2026-08-20", revisadoPor: null },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4, ultimaRevision: "2026-08-20", revisadoPor: null },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4, ultimaRevision: "2026-07-28", revisadoPor: null },
    gas_baja_presion: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 2, ultimaRevision: "2026-07-28", revisadoPor: null },
    irve: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5, ultimaRevision: "2026-07-28", revisadoPor: null },
  },
  navarra: {
    acs: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4, ultimaRevision: "2026-07-28", revisadoPor: null },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 3, ultimaRevision: "2026-07-28", revisadoPor: null },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5, ultimaRevision: "2026-07-28", revisadoPor: null },
    gas_baja_presion: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4, ultimaRevision: "2026-07-28", revisadoPor: null },
    irve: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5, ultimaRevision: "2026-07-28", revisadoPor: null },
  },
  pais_vasco: {
    acs: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 2, ultimaRevision: "2026-07-28", revisadoPor: null },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 2, ultimaRevision: "2026-07-27", revisadoPor: null },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4, ultimaRevision: "2026-08-20", revisadoPor: null },
    gas_baja_presion: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 3, ultimaRevision: "2026-08-20", revisadoPor: null },
    irve: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4, ultimaRevision: "2026-07-28", revisadoPor: null },
  },
};
