import type { DbAlertaBoe } from "./supabase";
import { alertaRelevanteParaCartera, type ExpedienteMatch } from "./alertas";

const URGENCIA_LABEL: Record<string, string> = {
  alta: "Urgencia alta",
  media: "Urgencia media",
  baja: "Urgencia baja",
};

const TIPO_LABEL: Record<DbAlertaBoe["tipo"], string> = {
  normativa_nueva: "Normativa nueva",
  modificacion: "Modificación",
  derogacion: "Derogación",
};

/**
 * Alertas nuevas (creadas desde `desdeIso`) relevantes para la cartera real
 * de la organización. Origen: roadmap de mejoras, QW-02 -- segunda mitad
 * del "radar normativo personalizado" (la primera, el filtro en pantalla,
 * ya está en AlertasBoeList.tsx).
 *
 * Reutiliza alertaRelevanteParaCartera en vez de reimplementar el criterio
 * de relevancia: es la misma pregunta ("¿le importa esto a esta cartera?")
 * que ya responde el filtro en pantalla.
 */
export function alertasParaDigest(
  alertas: DbAlertaBoe[],
  expedientes: ExpedienteMatch[],
  desdeIso: string
): DbAlertaBoe[] {
  return alertas.filter(
    (a) => a.creado_en >= desdeIso && alertaRelevanteParaCartera(a, expedientes)
  );
}

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * HTML del email semanal. Deliberadamente simple (sin plantilla externa):
 * mismo nivel de sofisticación que el email de contacto en
 * apps/api/routers/contacto.py, no un builder de newsletters.
 */
export function construirHtmlDigest(alertas: DbAlertaBoe[], nombreOrg: string): string {
  const filas = alertas
    .map((a) => {
      const urgencia = a.nivel_urgencia ? URGENCIA_LABEL[a.nivel_urgencia] : null;
      const ccaa = a.ccaa_afectadas?.length ? a.ccaa_afectadas.join(", ") : "Todas las CCAA";
      const vertical = a.verticales_afectados?.length
        ? a.verticales_afectados.join(", ")
        : "Todos los verticales";
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #E1E5F0;">
            <p style="margin:0;font-weight:600;">${escaparHtml(a.titulo)}</p>
            <p style="margin:4px 0 0;color:#4B5468;font-size:13px;">
              ${TIPO_LABEL[a.tipo]}${urgencia ? ` · ${urgencia}` : ""} · ${escaparHtml(ccaa)} · ${escaparHtml(vertical)}
            </p>
            ${a.resumen ? `<p style="margin:6px 0 0;font-size:13px;">${escaparHtml(a.resumen)}</p>` : ""}
          </td>
        </tr>`;
    })
    .join("");

  return `
    <div style="font-family:sans-serif;color:#10182B;max-width:560px;">
      <p>Hola ${escaparHtml(nombreOrg)},</p>
      <p>Esta semana el pipeline normativo de PermitFlow ha detectado
      ${alertas.length} cambio${alertas.length === 1 ? "" : "s"} que afecta${alertas.length === 1 ? "" : "n"}
      a tu cartera de expedientes:</p>
      <table style="width:100%;border-collapse:collapse;">${filas}</table>
      <p style="margin-top:20px;font-size:13px;color:#4B5468;">
        Revisa el detalle y márcalas como leídas desde tu panel de Alertas BOE.
      </p>
    </div>`;
}
