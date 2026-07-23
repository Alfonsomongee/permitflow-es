import {
  COMUNIDAD_LABEL,
  TIPO_LABEL,
  type PlanTramitacion,
  type InstalacionParams,
} from "@/types/plan";

/**
 * Construye el system prompt para DeepSeek combinando tres capas de contexto:
 *
 * 1. Contexto general de PermitFlow ES (quién es, qué hace, los 5 verticales)
 * 2. Plan de tramitación del expediente activo (trámites, plazos, organismos)
 * 3. Normativa JSON del vertical (base legal detallada)
 *
 * Si alguna capa no está disponible (ej. el usuario está en la landing),
 * simplemente se omite del prompt.
 */
export function buildSystemPrompt(
  plan?: PlanTramitacion | null,
  params?: InstalacionParams | null,
  normativaJson?: object | null
): string {
  const sections: string[] = [];

  // ── Capa 1: Contexto general ───────────────────────────────────────────────
  sections.push(`
Eres el asistente normativo de PermitFlow ES, una plataforma SaaS B2B que digitaliza y 
automatiza la tramitación burocrática del sector energético en España.

Tu función es ayudar a instaladoras, gestorías y técnicos a entender qué trámites necesitan 
realizar para legalizar instalaciones técnicas en las diferentes Comunidades Autónomas.

Los 5 verticales disponibles en Andalucía (cobertura completa) son:
- Fotovoltaica de autoconsumo (RD 244/2019, PUES, RAC en MITECO)
- Recarga de vehículos eléctricos IRVE (REBT ITC-BT-52, PUES/TECI, MOVES III)
- Climatización y aerotermia (RITE, RSIF, F-Gas UE 2024/573)
- Agua caliente sanitaria ACS (RITE, RD 487/2022 Legionella)
- Gas baja presión (RIGLO RD 919/2006, IRG, UNE 60670)

Para el resto de Comunidades Autónomas, la cobertura actual es solo fotovoltaica.

Reglas de comportamiento:
- Responde SIEMPRE en español.
- Sé preciso, conciso y cita la base legal cuando sea relevante.
- Si no tienes certeza sobre algo, indícalo claramente y sugiere consultar con un técnico.
- No inventes normativa ni plazos que no aparezcan en el contexto proporcionado.
- Si el usuario pregunta algo fuera del ámbito de tramitaciones técnicas en España, 
  indícale amablemente que tu especialidad son los trámites de instalaciones.
`.trim());

  // ── Capa 2: Contexto del expediente activo ─────────────────────────────────
  if (plan && params) {
    const tipoLabel = TIPO_LABEL;
    const comunidadLabel = COMUNIDAD_LABEL;

    const resumenTramites = plan.tramites
      .map(
        (t) =>
          `  ${t.orden}. ${t.nombre} — ${t.organismo} — ~${t.plazo_estimado_dias ?? "?"} días${
            t.plazo_legal_dias ? ` (legal: ${t.plazo_legal_dias}d)` : ""
          }${t.coste_estimado ? ` — ${t.coste_estimado}` : ""}${
            t.plataforma_url ? ` — Tramitar: ${t.plataforma_url}` : ""
          }`
      )
      .join("\n");

    sections.push(`
El usuario está viendo actualmente el siguiente expediente:

INSTALACIÓN:
- Tipo: ${tipoLabel[params.tipo_instalacion] ?? params.tipo_instalacion}
- Comunidad: ${comunidadLabel[params.comunidad] ?? params.comunidad}
- Municipio: ${params.municipio}
- Potencia: ${params.potencia_kw} kW
- Uso: ${params.uso ?? "no especificado"}
${params.numero_puntos ? `- Puntos de recarga: ${params.numero_puntos}` : ""}
${params.acceso_publico !== undefined ? `- Acceso público: ${params.acceso_publico ? "Sí" : "No"}` : ""}
${params.solicita_ayuda ? "- Solicita ayudas/subvenciones: Sí" : ""}

PLAN DE TRAMITACIÓN (${plan.tramites.length} trámites, ~${plan.tiempo_total_estimado_dias ?? "?"} días estimados):
${resumenTramites}

ADVERTENCIAS DEL MOTOR:
${plan.advertencias.map((a) => `- ${a}`).join("\n")}

Cuando el usuario pregunte sobre "el expediente", "la instalación", "los trámites" o use 
pronombres que hagan referencia al contexto, usa SIEMPRE la información anterior.
`.trim());
  }

  // ── Capa 3: Normativa JSON del vertical ────────────────────────────────────
  if (normativaJson) {
    // En lugar de volcar el fichero entero (y truncarlo por la mitad dejando
    // JSON inválido en el contexto), enviamos solo las reglas que realmente
    // aplicaron a ESTE expediente, identificadas por regla_id del plan.
    const reglasAplicadas = new Set(
      (plan?.tramites ?? []).map((t) => t.regla_id).filter(Boolean)
    );
    const fuente = normativaJson as {
      reglas?: Array<{ id?: string }>;
      fuentes?: string[];
      version?: string;
      ultima_revision?: string;
    };
    const relevante =
      reglasAplicadas.size > 0 && Array.isArray(fuente.reglas)
        ? {
            version: fuente.version,
            ultima_revision: fuente.ultima_revision,
            fuentes: fuente.fuentes,
            reglas: fuente.reglas.filter((r) => r.id && reglasAplicadas.has(r.id)),
          }
        : normativaJson;

    const normativaStr = JSON.stringify(relevante, null, 0);
    // Salvaguarda: si aun filtrado excede el límite, truncamos con aviso.
    const truncated =
      normativaStr.length > 12000
        ? normativaStr.slice(0, 12000) + "...[normativa truncada por longitud]"
        : normativaStr;

    sections.push(`
NORMATIVA JSON DEL VERTICAL (motor de reglas interno):
Usa esta información para responder preguntas sobre base legal, condiciones de aplicación 
y detalles de los trámites:

${truncated}
`.trim());
  }

  return sections.join("\n\n---\n\n");
}
