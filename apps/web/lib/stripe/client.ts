import Stripe from "stripe";

/**
 * Cliente de Stripe compartido (antes se construía idéntico en 3 rutas, con la
 * versión de API forzada mediante `as any`). Sin `apiVersion` explícita el SDK
 * usa la versión con la que fue generado, que es la misma que se fijaba a mano.
 *
 * Se crea de forma perezosa y falla con un error claro si falta la clave, en
 * vez de usar un placeholder que provocaba errores de autenticación opacos.
 */
let instancia: Stripe | null = null;

export function getStripe(): Stripe {
  if (instancia) return instancia;
  const clave = process.env.STRIPE_SECRET_KEY;
  if (!clave) {
    throw new Error("STRIPE_SECRET_KEY no está configurada.");
  }
  instancia = new Stripe(clave);
  return instancia;
}
