/**
 * apps/web/lib/supabase.ts
 *
 * Dos clientes Supabase:
 * - supabaseAdmin: usa SERVICE_ROLE, solo en Server Components y API Routes.
 *   Bypassa RLS. NUNCA exponer al cliente.
 * - supabaseClient: usa ANON key, seguro para el navegador (respeta RLS).
 */
import { createClient } from "@supabase/supabase-js";
import type { PlanTramitacion, TramitesEstadoMap } from "@/types/plan";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder";

// ─── Admin (server-side only) ─────────────────────────────────────────────────
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ─── Client (browser-safe) ───────────────────────────────────────────────────
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Tipos inferidos del schema ───────────────────────────────────────────────

export interface DbOrganizacion {
  id: string;
  clerk_org_id: string;
  nombre: string;
  plan: "free" | "pro" | "enterprise";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  suscripcion_activa: boolean;
  suscripcion_fin: string | null;
  creado_en: string;
  actualizado_en: string;
}

export interface DbExpediente {
  id: string;
  org_id: string;
  clerk_user_id: string;
  tipo_instalacion: string;
  comunidad: string;
  municipio: string;
  potencia_kw: number;
  uso: string;
  numero_puntos: number | null;
  modo_recarga: string | null;
  acceso_publico: boolean | null;
  ubicacion_irve: string | null;
  requiere_nuevo_suministro: boolean | null;
  combustible: string | null;
  presion_bar: string | null;
  solicita_ayuda: boolean;
  plan_tramitacion: PlanTramitacion | null;
  tiempo_total_dias: number | null;
  estado: "borrador" | "pendiente" | "en_revision" | "aprobado" | "rechazado";
  tramites_completados: number;
  tramites_estado: TramitesEstadoMap;
  referencia_cliente: string | null;
  notas: string | null;
  version: number;
  creado_en: string;
  actualizado_en: string;
}

export interface DbAlertaBoe {
  id: string;
  org_id: string | null;
  tipo: "normativa_nueva" | "modificacion" | "derogacion";
  titulo: string;
  resumen: string | null;
  fuente_url: string | null;
  ccaa_afectadas: string[] | null;
  verticales_afectados: string[] | null;
  leida: boolean;
  creado_en: string;
}
