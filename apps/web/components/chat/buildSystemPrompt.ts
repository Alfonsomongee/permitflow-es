import {
  type PlanTramitacion,
  type InstalacionParams,
} from "@/types/plan";

/**
 * El system prompt ahora se genera en el backend (FastAPI) para
 * proteger los JSONs normativos completos y asegurar el tracking de tokens.
 * Esta función se mantiene por compatibilidad temporal pero devuelve un dummy.
 */
export function buildSystemPrompt(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  plan?: PlanTramitacion | null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params?: InstalacionParams | null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  normativaJson?: object | null
): string {
  return "[Generado en backend]";
}
