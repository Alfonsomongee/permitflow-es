/**
 * Criterio único para traducir el estado de verificación de una normativa a la
 * severidad que se enseña al usuario.
 *
 * Origen: auditoría QA 2026-08-11, hallazgo A-01. Esta lógica estaba escrita dos
 * veces —`nivelCobertura()` en el paso 1 del formulario y `severidadVerificacion()`
 * en la vista del plan— con el orden de los condicionales invertido. Resultado:
 * Aragón y Asturias (9 combinaciones) se anunciaban como "verificado
 * parcialmente" antes de clasificar y como "normativa genérica sin verificación
 * autonómica" justo después, con los mismos datos de partida.
 *
 * Los dos campos que intervienen no son redundantes:
 *
 * - `nivel_verificacion` es el nivel declarado del fichero de reglas, de un enum
 *   cerrado. Es el dato grueso.
 * - `estado` es la anotación de la última auditoría de contenido. Es más
 *   granular y puede discrepar del anterior en cualquiera de los dos sentidos.
 *
 * El docstring de `ClasificadorOutput.estado` en el backend dice que `estado`
 * debe primar. Aquí se cumple **en ambos sentidos**: antes solo se le dejaba
 * primar para agravar (`includes("no_verificado")`), nunca para atenuar, y por
 * eso Aragón y Asturias —verificadas parcialmente— salían como no verificadas.
 */

export type SeveridadVerificacion = "critico" | "atencion" | "ninguno";

export interface ResultadoVerificacion {
  nivel: SeveridadVerificacion;
  etiqueta: string;
}

/** Niveles del enum que significan "verificado, pero con reservas". */
const NIVELES_PARCIALES = new Set([
  "verificada_parcialmente",
  "verificado_con_observaciones",
  "en_revision",
  "borrador_verificado_parcialmente",
]);

/**
 * Traduce (nivel_verificacion, estado) a la severidad que ve el usuario.
 *
 * Orden de decisión, de más específico a más genérico:
 * 1. `estado` dice que es un borrador sin verificar -> crítico.
 * 2. `estado` dice que se verificó parcialmente o con observaciones -> atención.
 *    Va **antes** que la comprobación de "generica" a propósito: si alguien
 *    revisó el contenido y anotó el resultado, esa anotación es mejor
 *    información que el nivel genérico del fichero.
 * 3. El nivel es "generica" -> crítico: nadie ha verificado esta comunidad.
 * 4. El nivel es uno de los parciales -> atención.
 * 5. Verificado sin reservas.
 */
export function severidadDeVerificacion(
  nivelVerificacion: string | null | undefined,
  estado: string | null | undefined
): ResultadoVerificacion {
  const est = estado ?? "";

  if (est.includes("no_verificado")) {
    return { nivel: "critico", etiqueta: "Borrador no verificado" };
  }
  if (est.includes("parcial") || est.includes("observaciones")) {
    return { nivel: "atencion", etiqueta: "Verificado con observaciones" };
  }
  if (nivelVerificacion === "generica") {
    return {
      nivel: "critico",
      etiqueta: "Normativa genérica (sin verificación autonómica)",
    };
  }
  if (nivelVerificacion && NIVELES_PARCIALES.has(nivelVerificacion)) {
    return { nivel: "atencion", etiqueta: "Verificado con observaciones" };
  }
  return { nivel: "ninguno", etiqueta: "Verificado" };
}
