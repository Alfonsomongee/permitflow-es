// GENERADO desde las condiciones json-logic de apps/api/motor_normativo/reglas/*/*.json
// — no editar a mano. Regenerar con: python3 scripts/generar_campos_condicionales.py
//
// Para cada combinación comunidad x tecnología, los campos que las reglas de ESA
// combinación usan realmente. El formulario pregunta solo esos: si una comunidad no
// ramifica sobre 'uso_colectivo', no tiene sentido preguntarlo allí.
//
// Se genera en vez de mantenerse a mano porque mantener esta correspondencia a mano
// es justo lo que provocó el hallazgo C-01 de la auditoría QA 2026-08-11: 9 campos
// que las reglas usaban y el formulario nunca recogía, con json-logic evaluándolos
// como falsy y dejando fuera trámites reales sin avisar.

export const CAMPOS_CONDICIONALES: Record<string, Record<string, readonly string[]>> = {
  andalucia: {
    acs: ["acumulacion", "combustible", "inversion_eur", "recirculacion", "tipo_generador_acs", "uso_colectivo"],
    climatizacion_aerotermia: [],
    fotovoltaica_autoconsumo: ["inversion_eur", "modalidad_autoconsumo", "nivel_tension_conexion"],
    gas_baja_presion: [],
    irve: ["acceso_publico", "inversion_eur", "modo_recarga", "numero_puntos", "potencia_por_punto_kw", "requiere_nuevo_suministro", "ubicacion_irve"],
  },
  aragon: {
    acs: ["tipo_generador_acs", "uso_colectivo"],
    climatizacion_aerotermia: [],
    fotovoltaica_autoconsumo: [],
    gas_baja_presion: ["presion_bar"],
    irve: ["modo_recarga", "ubicacion_irve"],
  },
  asturias: {
    acs: ["acs_centralizada", "tipo_generador_acs"],
    climatizacion_aerotermia: [],
    fotovoltaica_autoconsumo: ["modalidad_autoconsumo"],
    gas_baja_presion: ["presion_bar"],
    irve: ["modo_recarga", "ubicacion_irve"],
  },
  baleares: {
    acs: ["tipo_generador_acs", "uso_colectivo"],
    climatizacion_aerotermia: [],
    fotovoltaica_autoconsumo: [],
    gas_baja_presion: [],
    irve: ["modo_recarga", "ubicacion_irve"],
  },
  canarias: {
    acs: ["incluida_ambito_rd_487_2022", "tipo_generador_acs"],
    climatizacion_aerotermia: [],
    fotovoltaica_autoconsumo: ["implantacion", "instalacion_origen_modificada"],
    gas_baja_presion: ["presion_bar"],
    irve: ["instalacion_origen_modificada", "modo_recarga", "ubicacion_irve"],
  },
  cantabria: {
    acs: ["tipo_generador_acs"],
    climatizacion_aerotermia: [],
    fotovoltaica_autoconsumo: [],
    gas_baja_presion: ["presion_bar"],
    irve: ["modo_recarga", "ubicacion_irve"],
  },
  castilla_la_mancha: {
    acs: ["tipo_generador_acs"],
    climatizacion_aerotermia: [],
    fotovoltaica_autoconsumo: [],
    gas_baja_presion: [],
    irve: ["modo_recarga", "ubicacion_irve"],
  },
  castilla_leon: {
    acs: ["tipo_generador_acs", "uso_colectivo"],
    climatizacion_aerotermia: [],
    fotovoltaica_autoconsumo: [],
    gas_baja_presion: ["presion_bar"],
    irve: ["modo_recarga", "ubicacion_irve"],
  },
  cataluna: {
    acs: ["acs_centralizada", "dispone_acumulacion", "dispone_circuito_retorno", "incluida_ambito_legionella", "tipo_generador_acs"],
    climatizacion_aerotermia: [],
    fotovoltaica_autoconsumo: ["modalidad_autoconsumo", "nivel_tension_conexion", "requiere_acceso_conexion", "requiere_registro_produccion", "ubicacion_suelo"],
    gas_baja_presion: ["clase_instalacion_gas", "es_ampliacion", "incremento_potencia_pct", "potencia_resultante_kw", "presion_resultante_bar"],
    irve: ["garaje_existente", "modo_recarga", "numero_plazas_garaje", "numero_suministros_edificio", "ubicacion_irve", "uso_edificio", "ventilacion_garaje"],
  },
  comunidad_valenciana: {
    acs: ["tipo_generador_acs"],
    climatizacion_aerotermia: [],
    fotovoltaica_autoconsumo: ["inversion_eur"],
    gas_baja_presion: ["presion_bar"],
    irve: ["modo_recarga", "ubicacion_irve"],
  },
  extremadura: {
    acs: ["tipo_generador_acs"],
    climatizacion_aerotermia: [],
    fotovoltaica_autoconsumo: [],
    gas_baja_presion: ["presion_bar"],
    irve: ["modo_recarga", "ubicacion_irve"],
  },
  galicia: {
    acs: ["tipo_generador_acs"],
    climatizacion_aerotermia: [],
    fotovoltaica_autoconsumo: [],
    gas_baja_presion: [],
    irve: ["modo_recarga", "ubicacion_irve"],
  },
  la_rioja: {
    acs: ["tipo_generador_acs"],
    climatizacion_aerotermia: [],
    fotovoltaica_autoconsumo: [],
    gas_baja_presion: ["presion_bar"],
    irve: ["modo_recarga", "ubicacion_irve"],
  },
  madrid: {
    acs: ["incluida_ambito_rd_487_2022", "tipo_generador_acs"],
    climatizacion_aerotermia: [],
    fotovoltaica_autoconsumo: ["nivel_tension_conexion", "nivel_tension_consumidor", "nivel_tension_generacion", "requiere_registro_produccion"],
    gas_baja_presion: ["clase_instalacion_gas", "es_ampliacion", "incremento_potencia_pct", "potencia_resultante_kw", "presion_resultante_bar"],
    irve: ["modo_recarga", "ubicacion_irve"],
  },
  murcia: {
    acs: ["tipo_generador_acs"],
    climatizacion_aerotermia: [],
    fotovoltaica_autoconsumo: [],
    gas_baja_presion: ["presion_bar"],
    irve: ["modo_recarga", "ubicacion_irve"],
  },
  navarra: {
    acs: ["tipo_generador_acs"],
    climatizacion_aerotermia: [],
    fotovoltaica_autoconsumo: [],
    gas_baja_presion: ["presion_bar"],
    irve: ["modo_recarga", "ubicacion_irve"],
  },
  pais_vasco: {
    acs: ["tipo_generador_acs", "uso_colectivo"],
    climatizacion_aerotermia: [],
    fotovoltaica_autoconsumo: ["inversion_eur"],
    gas_baja_presion: ["presion_bar"],
    irve: ["modo_recarga", "ubicacion_irve"],
  },
};

/** ¿Las reglas de esta comunidad y tecnología usan este campo? */
export function campoAplica(
  comunidad: string,
  tipoInstalacion: string,
  campo: string
): boolean {
  return CAMPOS_CONDICIONALES[comunidad]?.[tipoInstalacion]?.includes(campo) ?? false;
}
