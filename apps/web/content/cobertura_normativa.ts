// GENERADO desde apps/api/motor_normativo/reglas/*/*.json — no editar a mano.
// Regenerar con: python3 scripts/generar_cobertura_normativa.py
// Refleja el nivel de verificación real de cada combinación comunidad x tecnología,
// para que el selector de "Nueva instalación" no muestre un aviso binario desconectado
// del contenido real del motor normativo.

export interface CoberturaCombo {
  nivelVerificacion: string;
  estado: string | null;
  huecos: number;
}

export const COBERTURA_NORMATIVA: Record<string, Record<string, CoberturaCombo>> = {
  andalucia: {
    acs: { nivelVerificacion: "verificada", estado: null, huecos: 9 },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: null, huecos: 7 },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: null, huecos: 15 },
    gas_baja_presion: { nivelVerificacion: "generica", estado: null, huecos: 5 },
    irve: { nivelVerificacion: "generica", estado: null, huecos: 12 },
  },
  aragon: {
    acs: { nivelVerificacion: "generica", estado: "verificado_parcialmente", huecos: 6 },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: "verificado_parcialmente", huecos: 5 },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 7 },
    gas_baja_presion: { nivelVerificacion: "generica", estado: "verificado_parcialmente", huecos: 8 },
    irve: { nivelVerificacion: "generica", estado: "verificado_parcialmente", huecos: 4 },
  },
  asturias: {
    acs: { nivelVerificacion: "generica", estado: "verificado_parcialmente", huecos: 7 },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: "verificado_parcialmente", huecos: 5 },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: "verificado_parcialmente", huecos: 9 },
    gas_baja_presion: { nivelVerificacion: "generica", estado: "verificado_parcialmente", huecos: 7 },
    irve: { nivelVerificacion: "generica", estado: "verificado_parcialmente", huecos: 6 },
  },
  baleares: {
    acs: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 6 },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5 },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 6 },
    gas_baja_presion: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 6 },
    irve: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5 },
  },
  canarias: {
    acs: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5 },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4 },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 11 },
    gas_baja_presion: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 7 },
    irve: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5 },
  },
  cantabria: {
    acs: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 7 },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4 },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 6 },
    gas_baja_presion: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 7 },
    irve: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5 },
  },
  castilla_la_mancha: {
    acs: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 7 },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5 },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5 },
    gas_baja_presion: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5 },
    irve: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5 },
  },
  castilla_leon: {
    acs: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 8 },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 6 },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 6 },
    gas_baja_presion: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 8 },
    irve: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 6 },
  },
  cataluna: {
    acs: { nivelVerificacion: "verificada_parcialmente", estado: "verificado_con_observaciones", huecos: 2 },
    climatizacion_aerotermia: { nivelVerificacion: "verificada_parcialmente", estado: "verificado_con_observaciones", huecos: 2 },
    fotovoltaica_autoconsumo: { nivelVerificacion: "en_revision", estado: "borrador_verificado_parcialmente", huecos: 6 },
    gas_baja_presion: { nivelVerificacion: "verificada_parcialmente", estado: "verificado_con_observaciones", huecos: 3 },
    irve: { nivelVerificacion: "verificada_parcialmente", estado: "verificado_con_observaciones", huecos: 3 },
  },
  comunidad_valenciana: {
    acs: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 6 },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5 },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 6 },
    gas_baja_presion: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 7 },
    irve: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 7 },
  },
  extremadura: {
    acs: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5 },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 3 },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 3 },
    gas_baja_presion: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5 },
    irve: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5 },
  },
  galicia: {
    acs: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 6 },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 7 },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 6 },
    gas_baja_presion: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5 },
    irve: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 7 },
  },
  la_rioja: {
    acs: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 8 },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 6 },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5 },
    gas_baja_presion: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5 },
    irve: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5 },
  },
  madrid: {
    acs: { nivelVerificacion: "verificada_parcialmente", estado: "verificado_con_observaciones", huecos: 3 },
    climatizacion_aerotermia: { nivelVerificacion: "verificada_parcialmente", estado: "verificado_con_observaciones", huecos: 2 },
    fotovoltaica_autoconsumo: { nivelVerificacion: "verificada_parcialmente", estado: "verificado_con_observaciones", huecos: 3 },
    gas_baja_presion: { nivelVerificacion: "verificada_parcialmente", estado: "verificado_con_observaciones", huecos: 3 },
    irve: { nivelVerificacion: "verificada_parcialmente", estado: "verificado_con_observaciones", huecos: 2 },
  },
  murcia: {
    acs: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5 },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4 },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 6 },
    gas_baja_presion: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5 },
    irve: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 6 },
  },
  navarra: {
    acs: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 6 },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4 },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 6 },
    gas_baja_presion: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5 },
    irve: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 6 },
  },
  pais_vasco: {
    acs: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 4 },
    climatizacion_aerotermia: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 2 },
    fotovoltaica_autoconsumo: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 6 },
    gas_baja_presion: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5 },
    irve: { nivelVerificacion: "generica", estado: "borrador_no_verificado", huecos: 5 },
  },
};
