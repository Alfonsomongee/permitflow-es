/**
 * Datos del titular del servicio que exige el art. 10 de la LSSI-CE y el art. 13
 * del RGPD. NO se pueden inventar: los tiene que completar quien opera el
 * servicio (razón social, NIF, domicilio, correo de contacto y de privacidad).
 * Mientras un dato sea `null`, las páginas legales muestran el aviso
 * «pendiente de completar» y `datosLegalesCompletos()` devuelve false (hay un
 * test que lo recuerda en CI como aviso, no como fallo).
 */
export interface TitularServicio {
  razonSocial: string | null;
  nif: string | null;
  domicilio: string | null;
  registroMercantil: string | null;
  emailContacto: string | null;
  emailPrivacidad: string | null;
}

export const TITULAR: TitularServicio = {
  razonSocial: null,
  nif: null,
  domicilio: null,
  registroMercantil: null,
  emailContacto: null,
  emailPrivacidad: null,
};

export const FECHA_ULTIMA_ACTUALIZACION_LEGAL = "2026-10-01";

export function datosLegalesCompletos(titular: TitularServicio = TITULAR): boolean {
  return Object.values(titular).every((valor) => valor !== null && valor.trim() !== "");
}
