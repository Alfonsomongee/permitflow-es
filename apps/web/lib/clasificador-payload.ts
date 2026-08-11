/**
 * Construcción del payload que se envía a `POST /api/v1/clasificador`.
 *
 * Antes esta transformación vivía inline en `app/api/clasificar/route.ts` como
 * una lista de campos escrita a mano. Ese enfoque se quedó 9 campos por detrás
 * del schema del backend (`apps/api/schemas/clasificador.py::ClasificadorInput`),
 * y como json-logic evalúa una variable ausente como *falsy*, las reglas que
 * dependían de esos campos nunca se disparaban: la rama negativa ganaba en
 * silencio y el plan salía incompleto sin ningún aviso.
 *
 * Ahora los campos se declaran en listas por tipo de conversión. Añadir un campo
 * nuevo al motor es añadirlo a la lista que corresponda; el test de contrato
 * `apps/api/tests/test_contrato_frontend.py` falla si el schema del backend y
 * estas listas se desincronizan, y también si alguna regla usa una variable que
 * no se puede enviar desde aquí.
 */
import type { FormState } from "@/components/nueva-instalacion/types";

/** Campos que viajan tal cual como string (se omiten si están vacíos). */
export const CAMPOS_STRING = [
  "tipo_instalacion",
  "comunidad",
  "uso",
  "modo_recarga",
  "ubicacion_irve",
  "combustible",
  "presion_bar",
  "tension",
  "nivel_tension_consumidor",
  "nivel_tension_generacion",
  "nivel_tension_conexion",
  "modalidad_autoconsumo",
  "ubicacion_suelo",
  "uso_edificio",
  "ventilacion_garaje",
  "implantacion",
  "clase_instalacion_gas",
] as const;

/** Campos decimales (parseFloat; se omiten si están vacíos o no son numéricos). */
export const CAMPOS_NUMERO = [
  "potencia_kw",
  "superficie_m2",
  "potencia_por_punto_kw",
  "inversion_eur",
  "potencia_resultante_kw",
  "presion_resultante_bar",
  "incremento_potencia_pct",
] as const;

/** Campos enteros (parseInt). */
export const CAMPOS_ENTERO = [
  "numero_puntos",
  "numero_plazas_garaje",
  "numero_suministros_edificio",
] as const;

/** Campos booleanos (se omiten si son `undefined`; `false` sí se envía). */
export const CAMPOS_BOOLEAN = [
  "acceso_publico",
  "requiere_nuevo_suministro",
  "requiere_acceso_conexion",
  "es_ampliacion",
  "garaje_existente",
  "acs_centralizada",
  "incluida_ambito_legionella",
  "dispone_acumulacion",
  "dispone_circuito_retorno",
  "solicita_ayuda",
  "uso_colectivo",
  "acumulacion",
  "recirculacion",
  "instalacion_origen_modificada",
  "incluida_ambito_rd_487_2022",
  "requiere_registro_produccion",
] as const;

/**
 * Campos del formulario que NO pertenecen a `ClasificadorInput`: son datos del
 * expediente, no de la clasificación. Se listan explícitamente para que el test
 * de contrato pueda distinguir "campo omitido a propósito" de "campo olvidado".
 */
export const CAMPOS_NO_CLASIFICADOR = ["referencia_cliente"] as const;

type Payload = Record<string, string | number | boolean>;

function esVacio(valor: unknown): boolean {
  return valor === undefined || valor === null || valor === "";
}

/**
 * Convierte el estado del formulario (todo strings y booleanos) al payload
 * tipado que espera el motor normativo. Los campos sin valor se omiten en vez
 * de enviarse como `null`, para que Pydantic aplique sus defaults.
 */
export function construirPayloadClasificador(formState: FormState): Payload {
  const state = formState as unknown as Record<string, unknown>;
  const payload: Payload = {};

  for (const campo of CAMPOS_STRING) {
    const valor = state[campo];
    if (!esVacio(valor)) payload[campo] = String(valor);
  }

  for (const campo of CAMPOS_NUMERO) {
    const valor = state[campo];
    if (esVacio(valor)) continue;
    const num = typeof valor === "number" ? valor : parseFloat(String(valor));
    if (!Number.isNaN(num)) payload[campo] = num;
  }

  for (const campo of CAMPOS_ENTERO) {
    const valor = state[campo];
    if (esVacio(valor)) continue;
    const num = typeof valor === "number" ? valor : parseInt(String(valor), 10);
    if (!Number.isNaN(num)) payload[campo] = num;
  }

  for (const campo of CAMPOS_BOOLEAN) {
    const valor = state[campo];
    if (typeof valor === "boolean") payload[campo] = valor;
  }

  return payload;
}
