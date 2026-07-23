# apps/web/app/(dashboard)/expedientes/[id]/page.tsx

`	sx
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import fs from "fs";
import path from "path";
import { PlanTramitacionView } from "@/components/plan-tramitacion";
import { ChatWidget } from "@/components/chat";
import { obtenerExpediente } from "@/lib/expedientes";
import { alertasNoLeidasParaExpediente } from "@/lib/alertas";
import { AlertasExpedienteBanner } from "@/components/plan-tramitacion/AlertasExpedienteBanner";
import type { InstalacionParams } from "@/types/plan";

interface PageProps {
  params: {
    id: string;
  };
}

const SLUG_SEGURO = /^[a-z_]+$/;

function readNormativaJson(params: InstalacionParams): Record<string, unknown> | null {
  if (!SLUG_SEGURO.test(params.comunidad) || !SLUG_SEGURO.test(params.tipo_instalacion)) {
    return null;
  }

  try {
    const reglasDir = path.resolve(process.cwd(), "../api/motor_normativo/reglas");
    const filePath = path.resolve(reglasDir, params.comunidad, `${params.tipo_instalacion}.json`);

    if (!filePath.startsWith(reglasDir + path.sep)) {
      return null;
    }

    const fileContent = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(fileContent) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export default async function ExpedienteDetallePage({ params }: PageProps) {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/sign-in");
  }

  const expediente = await obtenerExpediente(params.id, orgId);
  if (!expediente?.plan_tramitacion) {
    notFound();
  }

  const instalacionParams: InstalacionParams = {
    tipo_instalacion: expediente.tipo_instalacion,
    comunidad: expediente.comunidad,
    municipio: expediente.municipio,
    potencia_kw: expediente.potencia_kw,
    uso: expediente.uso,
    numero_puntos: expediente.numero_puntos ?? undefined,
    modo_recarga: expediente.modo_recarga ?? undefined,
    acceso_publico: expediente.acceso_publico ?? undefined,
    ubicacion_irve: expediente.ubicacion_irve ?? undefined,
    solicita_ayuda: expediente.solicita_ayuda,
  };

  const plan = expediente.plan_tramitacion;
  const normativaJson = readNormativaJson(instalacionParams);
  const alertasRelacionadas = await alertasNoLeidasParaExpediente(orgId, expediente);

  return (
    <>
      <AlertasExpedienteBanner alertas={alertasRelacionadas} />
      <PlanTramitacionView
        plan={plan}
        params={instalacionParams}
        expediente={{
          id: expediente.id,
          estado: expediente.estado,
          tramitesCompletados: expediente.tramites_completados,
          creadoEn: expediente.creado_en,
          actualizadoEn: expediente.actualizado_en,
          tramitesEstado: expediente.tramites_estado ?? {},
          referenciaCliente: expediente.referencia_cliente,
          notas: expediente.notas,
        }}
      />
      <ChatWidget
        plan={plan}
        params={instalacionParams}
        normativaJson={normativaJson}
      />
    </>
  );
}

`

# apps/web/app/(dashboard)/nueva-instalacion/page.tsx

`	sx
/**
 * apps/web/app/(dashboard)/nueva-instalacion/page.tsx
 *
 * Página de nueva instalación. Delega completamente en NuevaInstalacionForm,
 * que gestiona el estado multi-paso y la navegación al plan de tramitación.
 *
 * Este archivo es deliberadamente minimalista: toda la lógica vive en
 * components/nueva-instalacion/ para facilitar el testing y la reutilización.
 */
import { NuevaInstalacionForm } from "@/components/nueva-instalacion";

export default function NuevaInstalacionPage() {
  return <NuevaInstalacionForm />;
}

`

# apps/web/lib/expedientes.ts

`	sx
import { supabaseAdmin, type DbExpediente } from "./supabase";
import type { FormState } from "@/components/nueva-instalacion/types";
import type {
  PlanTramitacion,
  TramiteEstado,
  TramitesEstadoMap,
} from "@/types/plan";
import { hoyIso } from "./plazos";

function fallbackOrgName(clerkOrgId: string): string {
  return `Organizacion ${clerkOrgId.slice(-6)}`;
}

async function ensureOrgId(clerkOrgId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("organizaciones")
    .select("id")
    .eq("clerk_org_id", clerkOrgId)
    .maybeSingle();

  if (data?.id) return data.id;

  if (error) {
    throw new Error(`Error consultando organizacion: ${error.message}`);
  }

  const { data: created, error: createError } = await supabaseAdmin
    .from("organizaciones")
    .insert({
      clerk_org_id: clerkOrgId,
      nombre: fallbackOrgName(clerkOrgId),
    })
    .select("id")
    .single();

  if (createError || !created?.id) {
    throw new Error(
      `Error creando organizacion para Clerk (${clerkOrgId}): ${
        createError?.message ?? "sin detalle"
      }`
    );
  }

  return created.id;
}

export async function crearExpediente({
  clerkOrgId,
  clerkUserId,
  formState,
  plan,
}: {
  clerkOrgId: string;
  clerkUserId: string;
  formState: FormState;
  plan: PlanTramitacion;
}): Promise<DbExpediente> {
  const orgId = await ensureOrgId(clerkOrgId);

  const { data, error } = await supabaseAdmin
    .from("expedientes")
    .insert({
      org_id: orgId,
      clerk_user_id: clerkUserId,
      tipo_instalacion: formState.tipo_instalacion,
      comunidad: formState.comunidad,
      municipio: formState.municipio,
      potencia_kw: parseFloat(formState.potencia_kw) || 0,
      uso: formState.uso,
      numero_puntos: formState.numero_puntos
        ? parseInt(formState.numero_puntos, 10)
        : null,
      modo_recarga: formState.modo_recarga || null,
      acceso_publico: formState.acceso_publico,
      ubicacion_irve: formState.ubicacion_irve || null,
      requiere_nuevo_suministro: formState.requiere_nuevo_suministro,
      combustible: formState.combustible || null,
      presion_bar: formState.presion_bar || null,
      solicita_ayuda: formState.solicita_ayuda,
      plan_tramitacion: plan,
      tiempo_total_dias: plan.tiempo_total_estimado_dias,
      estado: "pendiente",
      tramites_completados: 0,
    })
    .select()
    .single();

  if (error) throw new Error(`Error creando expediente: ${error.message}`);
  return data;
}

export async function listarExpedientes(clerkOrgId: string): Promise<DbExpediente[]> {
  const orgId = await ensureOrgId(clerkOrgId);

  const { data, error } = await supabaseAdmin
    .from("expedientes")
    .select("*")
    .eq("org_id", orgId)
    .order("actualizado_en", { ascending: false });

  if (error) throw new Error(`Error listando expedientes: ${error.message}`);
  return data ?? [];
}

export async function obtenerExpediente(
  id: string,
  clerkOrgId: string
): Promise<DbExpediente | null> {
  const orgId = await ensureOrgId(clerkOrgId);

  const { data, error } = await supabaseAdmin
    .from("expedientes")
    .select("*")
    .eq("id", id)
    .eq("org_id", orgId)
    .single();

  if (error) return null;
  return data;
}

export async function actualizarEstado(
  id: string,
  clerkOrgId: string,
  estado: DbExpediente["estado"],
  tramitesCompletados?: number
): Promise<void> {
  const orgId = await ensureOrgId(clerkOrgId);
  const patch: Partial<Pick<DbExpediente, "estado" | "tramites_completados">> = {
    estado,
  };

  if (tramitesCompletados !== undefined) {
    patch.tramites_completados = tramitesCompletados;
  }

  const { error } = await supabaseAdmin
    .from("expedientes")
    .update(patch)
    .eq("id", id)
    .eq("org_id", orgId);

  if (error) throw new Error(`Error actualizando estado: ${error.message}`);
}

export async function eliminarExpediente(
  id: string,
  clerkOrgId: string
): Promise<void> {
  const orgId = await ensureOrgId(clerkOrgId);

  const { error } = await supabaseAdmin
    .from("expedientes")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId);

  if (error) throw new Error(`Error eliminando expediente: ${error.message}`);
}

export interface PatchExpedienteInput {
  tramite?: { orden: number; estado: TramiteEstado };
  referencia_cliente?: string | null;
  notas?: string | null;
}

export interface PatchExpedienteResult {
  tramites_estado: TramitesEstadoMap;
  tramites_completados: number;
  referencia_cliente: string | null;
  notas: string | null;
  actualizado_en: string;
}

export async function aplicarPatchExpediente(
  id: string,
  clerkOrgId: string,
  patch: PatchExpedienteInput
): Promise<PatchExpedienteResult> {
  // obtenerExpediente ya filtra por org_id: un usuario de otra organización
  // recibe null y nunca llega al UPDATE (evita IDOR, misma lección que alertas).
  const expediente = await obtenerExpediente(id, clerkOrgId);
  if (!expediente) {
    throw new Error("EXPEDIENTE_NO_ENCONTRADO");
  }

  const update: Record<string, unknown> = {
    actualizado_en: new Date().toISOString(),
  };

  if (patch.tramite) {
    const { orden, estado } = patch.tramite;
    const totalTramites = expediente.plan_tramitacion?.tramites?.length ?? 0;
    if (!Number.isInteger(orden) || orden < 1 || orden > totalTramites) {
      throw new Error("ORDEN_INVALIDO");
    }

    const mapa: TramitesEstadoMap = { ...(expediente.tramites_estado ?? {}) };
    const clave = String(orden);

    if (estado === "pendiente") {
      delete mapa[clave];
    } else {
      const previo = mapa[clave];
      mapa[clave] = {
        estado,
        fecha_inicio: previo?.fecha_inicio ?? hoyIso(),
        fecha_completado: estado === "completado" ? hoyIso() : null,
      };
    }

    update.tramites_estado = mapa;
    update.tramites_completados = Object.values(mapa).filter(
      (t) => t.estado === "completado"
    ).length;
  }

  if (patch.referencia_cliente !== undefined) {
    update.referencia_cliente =
      patch.referencia_cliente?.trim().slice(0, 120) || null;
  }
  if (patch.notas !== undefined) {
    update.notas = patch.notas?.trim().slice(0, 4000) || null;
  }

  const { data, error } = await supabaseAdmin
    .from("expedientes")
    .update(update)
    .eq("id", id)
    .eq("org_id", expediente.org_id)
    .select(
      "tramites_estado, tramites_completados, referencia_cliente, notas, actualizado_en"
    )
    .single();

  if (error || !data) {
    throw new Error(
      `Error actualizando expediente: ${error?.message ?? "sin detalle"}`
    );
  }
  return data as PatchExpedienteResult;
}

export function obtenerKpis(expedientes: DbExpediente[]) {
  return {
    total: expedientes.length,
    en_tramitacion: expedientes.filter(
      (expediente) =>
        expediente.estado === "pendiente" || expediente.estado === "en_revision"
    ).length,
    aprobados: expedientes.filter((expediente) => expediente.estado === "aprobado").length,
    borradores: expedientes.filter((expediente) => expediente.estado === "borrador").length,
  };
}

`

# apps/web/lib/supabase.ts

`	sx
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

`

# apps/web/components/plan-tramitacion/PlanTramitacionView.tsx

`	sx
"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3 } from "lucide-react";
import {
  type InstalacionParams,
  type PlanTramitacion,
  type TramitesEstadoMap,
  COMUNIDAD_LABEL,
  TIPO_LABEL,
} from "@/types/plan";
import { TramiteCard } from "./TramiteCard";
import { ResumenPanel } from "./ResumenPanel";
import { ExportPdfButton } from "./ExportPdfButton";
import { DetallesExpediente } from "./DetallesExpediente";
import { DocumentosPanel } from "./DocumentosPanel";
import { TimelinePlan } from "./TimelinePlan";
import { ValidadorPanel } from "./ValidadorPanel";
import { useTramitesEstado } from "./useTramitesEstado";
import { useEstadisticasPlazo } from "./useEstadisticasPlazo";
import { claveTramite } from "@/lib/tramiteClave";

type ExpedienteEstado =
  | "borrador"
  | "pendiente"
  | "en_revision"
  | "aprobado"
  | "rechazado";

interface PlanTramitacionViewProps {
  plan: PlanTramitacion;
  params: InstalacionParams;
  expediente?: {
    id: string;
    estado: ExpedienteEstado;
    tramitesCompletados: number;
    creadoEn: string;
    actualizadoEn: string;
    tramitesEstado: TramitesEstadoMap;
    referenciaCliente: string | null;
    notas: string | null;
  };
}

const ESTADO_LABEL: Record<ExpedienteEstado, string> = {
  borrador: "Borrador",
  pendiente: "Pendiente",
  en_revision: "En revision",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

function formatDate(value?: string): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function PlanTramitacionView({
  plan,
  params,
  expediente,
}: PlanTramitacionViewProps) {
  const { estados, completados, pendingOrden, error, setEstadoTramite } =
    useTramitesEstado(expediente?.id ?? "", expediente?.tramitesEstado ?? {});
  const estadisticasPlazo = useEstadisticasPlazo(expediente?.id);

  const titulo = TIPO_LABEL[params.tipo_instalacion] ?? params.tipo_instalacion;
  const ccaa = COMUNIDAD_LABEL[params.comunidad] ?? params.comunidad;
  const subtitulo = [titulo, ccaa, params.municipio, `${params.potencia_kw} kW`]
    .filter(Boolean)
    .join(" - ");

  const tramitesCompletados = expediente ? completados : 0;
  const progreso =
    expediente && plan.tramites.length > 0
      ? Math.round((tramitesCompletados / plan.tramites.length) * 100)
      : 0;
  const fechaActualizacion = formatDate(expediente?.actualizadoEn);

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/expedientes"
            className="flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft size={15} aria-hidden />
            Expedientes
          </Link>
          <span className="text-border">|</span>
          <div>
            <span className="text-sm font-medium text-text-primary">{titulo}</span>
            <span className="mx-2 text-text-secondary">-</span>
            <span className="text-sm text-text-secondary">{ccaa}</span>
          </div>
        </div>

        <ExportPdfButton titulo={titulo} expedienteId={expediente?.id} />
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-medium text-text-primary">
              Plan de tramitacion
            </h1>
            <p className="mt-1 text-sm text-text-secondary">{subtitulo}</p>
          </div>

          {expediente && (
            <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
              <div className="rounded-lg border border-border bg-surface px-3 py-2">
                <p className="text-[11px] uppercase tracking-wider text-text-secondary">
                  Estado
                </p>
                <p className="mt-0.5 text-sm font-medium text-text-primary">
                  {ESTADO_LABEL[expediente.estado]}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface px-3 py-2">
                <p className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-text-secondary">
                  <CheckCircle2 size={12} aria-hidden />
                  Progreso
                </p>
                <p className="mt-0.5 text-sm font-medium text-text-primary">
                  {tramitesCompletados}/{plan.tramites.length} ({progreso}%)
                </p>
              </div>
              {fechaActualizacion && (
                <div className="rounded-lg border border-border bg-surface px-3 py-2">
                  <p className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-text-secondary">
                    <Clock3 size={12} aria-hidden />
                    Actualizado
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-text-primary">
                    {fechaActualizacion}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          <TimelinePlan
            tramites={plan.tramites}
            estados={expediente ? estados : undefined}
            tiempoSerie={plan.tiempo_total_estimado_dias}
          />

          <div className="space-y-3">
            {error && (
              <p className="rounded-lg border border-danger/30 bg-danger-light px-4 py-2.5 text-xs text-danger-dark">
                {error}
              </p>
            )}
            {plan.tramites.map((tramite, i) => (
              <TramiteCard
                key={tramite.orden}
                tramite={tramite}
                defaultOpen={i < 2}
                estadoInfo={estados[String(tramite.orden)]}
                pending={pendingOrden === tramite.orden}
                onEstadoChange={
                  expediente
                    ? (estado) => setEstadoTramite(tramite.orden, estado)
                    : undefined
                }
                estadistica={estadisticasPlazo[claveTramite(tramite)]}
              />
            ))}
          </div>

          <div className="flex flex-col gap-4 lg:sticky lg:top-[61px] lg:self-start">
            {expediente && <ValidadorPanel expedienteId={expediente.id} />}
            {expediente && (
              <DocumentosPanel
                expedienteId={expediente.id}
                tipoInstalacion={params.tipo_instalacion}
              />
            )}
            {expediente && (
              <DetallesExpediente
                expedienteId={expediente.id}
                referenciaCliente={expediente.referenciaCliente}
                notas={expediente.notas}
              />
            )}
            <ResumenPanel plan={plan} params={params} />
          </div>
        </div>
      </main>
    </div>
  );
}

`

# apps/web/components/plan-tramitacion/TramiteCard.tsx

`	sx
"use client";

import { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Euro,
  ExternalLink,
  FileText,
  Loader2,
} from "lucide-react";
import { PlataformaBadge } from "./PlataformaBadge";
import type {
  DocumentoRequerido,
  EstadisticaPlazo,
  Tramite,
  TramiteEstado,
  TramiteEstadoInfo,
} from "@/types/plan";
import { calcularPlazo } from "@/lib/plazos";

function EstadisticaRealBadge({ estadistica }: { estadistica?: EstadisticaPlazo }) {
  if (!estadistica) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-0.5 text-[10px] text-text-secondary"
      title={`Basado en ${estadistica.muestraN} casos reales tramitados en PermitFlow`}
    >
      <BarChart3 size={10} aria-hidden />
      media real: {estadistica.medianaRealDias}d
    </span>
  );
}

function PlazoBadge({
  estimado,
  legal,
  estadoInfo,
}: {
  estimado: number | null;
  legal: number | null;
  estadoInfo?: TramiteEstadoInfo;
}) {
  const plazo = calcularPlazo(estadoInfo, legal);

  // Trámite en curso con plazo legal: semáforo verde/ámbar/rojo
  if (plazo && plazo.diasRestantes !== null && legal) {
    const { diasTranscurridos, diasRestantes, vencido } = plazo;
    const proximo = !vencido && diasRestantes <= 7;
    const estilo = vencido
      ? "bg-danger-light text-danger-dark"
      : proximo
        ? "bg-warning-light text-warning-dark"
        : "bg-success-light text-success-dark";
    const texto = vencido
      ? `plazo vencido hace ${Math.abs(diasRestantes)}d`
      : `dia ${diasTranscurridos} de ${legal} — quedan ${diasRestantes}d`;

    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${estilo}`}
        title="Dias naturales desde el inicio del tramite. Orientativo: algunos plazos legales se computan en dias habiles."
      >
        {vencido ? (
          <AlertTriangle size={10} aria-hidden />
        ) : (
          <Clock size={10} aria-hidden />
        )}
        {texto}
      </span>
    );
  }

  // En curso pero sin plazo legal definido
  if (plazo) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning-light px-2.5 py-0.5 text-[11px] font-medium text-warning-dark">
        <Clock size={10} aria-hidden />
        en curso — dia {plazo.diasTranscurridos}
      </span>
    );
  }

  if (!estimado && !legal) return null;

  const diff = legal && estimado ? legal - estimado : null;
  const hayMargen = diff !== null && diff > 0;

  return (
    <div className="flex items-center gap-1.5">
      {estimado && (
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] text-text-secondary">
          <Clock size={11} aria-hidden />
          ~{estimado} dias
        </span>
      )}
      {legal && (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
            hayMargen
              ? "bg-success-light text-success-dark"
              : "bg-warning-light text-warning-dark"
          }`}
          title={`Plazo legal maximo: ${legal} dias`}
        >
          {hayMargen ? (
            <CheckCircle2 size={10} aria-hidden />
          ) : (
            <AlertTriangle size={10} aria-hidden />
          )}
          legal: {legal}d
        </span>
      )}
    </div>
  );
}

const SIGUIENTE_ESTADO: Record<TramiteEstado, TramiteEstado> = {
  pendiente: "en_curso",
  en_curso: "completado",
  completado: "pendiente",
};

const ESTADO_TITULO: Record<TramiteEstado, string> = {
  pendiente: "Marcar como en curso",
  en_curso: "Marcar como completado",
  completado: "Volver a pendiente",
};

function EstadoTramiteButton({
  orden,
  estado,
  pending,
  onChange,
}: {
  orden: number;
  estado: TramiteEstado;
  pending: boolean;
  onChange?: (estado: TramiteEstado) => void;
}) {
  const base =
    "mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors";

  if (!onChange) {
    // Solo lectura (plan sin expediente persistido)
    return <span className={`${base} bg-primary text-white`}>{orden}</span>;
  }

  const estilo =
    estado === "completado"
      ? "bg-success text-white hover:opacity-90"
      : estado === "en_curso"
        ? "bg-warning text-white hover:opacity-90"
        : "border-2 border-border bg-surface text-text-secondary hover:border-primary hover:text-primary";

  return (
    <button
      onClick={() => onChange(SIGUIENTE_ESTADO[estado])}
      disabled={pending}
      className={`${base} ${estilo} disabled:opacity-60`}
      title={ESTADO_TITULO[estado]}
      aria-label={`Tramite ${orden}: ${ESTADO_TITULO[estado].toLowerCase()}`}
    >
      {pending ? (
        <Loader2 size={12} className="animate-spin" aria-hidden />
      ) : estado === "completado" ? (
        <Check size={13} aria-hidden />
      ) : (
        orden
      )}
    </button>
  );
}

function DocumentoItem({ doc }: { doc: DocumentoRequerido }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="border-b border-border last:border-0">
      <button
        className="flex w-full items-start gap-2.5 rounded px-1 py-2.5 text-left transition-colors hover:bg-bg"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        {doc.obligatorio ? (
          <FileText size={13} className="mt-0.5 flex-shrink-0 text-text-secondary/60" aria-hidden />
        ) : (
          <Circle size={13} className="mt-0.5 flex-shrink-0 text-text-secondary/40" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <span className="text-xs leading-snug text-text-primary">
            {doc.label}
            {!doc.obligatorio && (
              <span className="ml-1.5 text-[10px] text-text-secondary">(opcional)</span>
            )}
          </span>
          {expanded && doc.descripcion && (
            <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
              {doc.descripcion}
            </p>
          )}
        </div>
        <ChevronDown
          size={12}
          className={`mt-0.5 flex-shrink-0 text-text-secondary/50 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>
    </li>
  );
}

interface TramiteCardProps {
  tramite: Tramite;
  defaultOpen?: boolean;
  estadoInfo?: TramiteEstadoInfo;
  pending?: boolean;
  onEstadoChange?: (estado: TramiteEstado) => void;
  estadistica?: EstadisticaPlazo;
}

export function TramiteCard({
  tramite,
  defaultOpen = false,
  estadoInfo,
  pending = false,
  onEstadoChange,
  estadistica,
}: TramiteCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const estado: TramiteEstado = estadoInfo?.estado ?? "pendiente";

  const obligatorios = tramite.documentos_requeridos.filter((doc) => doc.obligatorio);
  const opcionales = tramite.documentos_requeridos.filter((doc) => !doc.obligatorio);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex w-full items-start gap-4 p-5 transition-colors hover:bg-bg">
        <EstadoTramiteButton
          orden={tramite.orden}
          estado={estado}
          pending={pending}
          onChange={onEstadoChange}
        />

        <button
          className="flex min-w-0 flex-1 items-start gap-4 text-left"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <div className="min-w-0 flex-1">
            <p
              className={`text-sm font-medium leading-snug ${
                estado === "completado"
                  ? "text-text-secondary line-through"
                  : "text-text-primary"
              }`}
            >
              {tramite.nombre}
            </p>
            <p className="mt-0.5 truncate text-xs text-text-secondary">
              {tramite.organismo}
            </p>
          </div>

          <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5">
              <PlataformaBadge plataforma={tramite.plataforma} />
              <ChevronDown
                size={15}
                className={`text-text-secondary transition-transform duration-200 ${
                  open ? "rotate-180" : ""
                }`}
                aria-hidden
              />
            </div>
            <PlazoBadge
              estimado={tramite.plazo_estimado_dias}
              legal={tramite.plazo_legal_dias}
              estadoInfo={estadoInfo}
            />
            <EstadisticaRealBadge estadistica={estadistica} />
          </div>
        </button>
      </div>

      {open && (
        <div className="divide-y divide-border border-t border-border">
          <div className="flex items-start justify-between gap-4 px-5 py-3">
            <p className="font-mono text-[11px] leading-relaxed text-text-secondary">
              {tramite.base_legal}
            </p>
            {tramite.plataforma_url && (
              <a
                href={tramite.plataforma_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-shrink-0 items-center gap-1 rounded-lg border border-primary/30 bg-primary-light px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-white"
              >
                Tramitar online
                <ExternalLink size={11} aria-hidden />
              </a>
            )}
          </div>

          {tramite.coste_estimado && (
            <div className="flex items-start gap-2.5 px-5 py-3">
              <Euro size={13} className="mt-0.5 flex-shrink-0 text-text-secondary/60" aria-hidden />
              <p className="text-xs leading-relaxed text-text-secondary">
                <span className="font-medium text-text-primary">Coste estimado: </span>
                {tramite.coste_estimado}
              </p>
            </div>
          )}

          {obligatorios.length > 0 && (
            <div className="px-5 py-3">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                Documentos obligatorios ({obligatorios.length})
              </p>
              <ul>
                {obligatorios.map((doc) => (
                  <DocumentoItem key={doc.id} doc={doc} />
                ))}
              </ul>
            </div>
          )}

          {opcionales.length > 0 && (
            <div className="px-5 py-3">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                Documentos opcionales ({opcionales.length})
              </p>
              <ul>
                {opcionales.map((doc) => (
                  <DocumentoItem key={doc.id} doc={doc} />
                ))}
              </ul>
            </div>
          )}

          {tramite.notas && (
            <div className="flex items-start gap-2.5 px-5 py-3">
              <AlertTriangle size={13} className="mt-0.5 flex-shrink-0 text-warning" aria-hidden />
              <p className="text-xs leading-relaxed text-text-secondary">
                {tramite.notas}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

`

# apps/web/components/plan-tramitacion/ResumenPanel.tsx

`	sx
import { AlertTriangle } from "lucide-react";
import {
  type InstalacionParams,
  type PlanTramitacion,
  COMUNIDAD_LABEL,
  TIPO_LABEL,
} from "@/types/plan";

interface ResumenPanelProps {
  params: InstalacionParams;
  plan: PlanTramitacion;
}

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="border-b border-border py-3 last:border-0">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="mt-0.5 text-xl font-medium text-text-primary">{value}</p>
    </div>
  );
}

function ParamRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | boolean | null;
}) {
  if (value === undefined || value === null || value === "") return null;
  const display = typeof value === "boolean" ? (value ? "Si" : "No") : String(value);

  return (
    <div className="flex items-start justify-between gap-2 border-b border-border py-1.5 text-xs last:border-0">
      <span className="text-text-secondary">{label}</span>
      <span className="max-w-[140px] text-right font-medium text-text-primary">
        {display}
      </span>
    </div>
  );
}

export function ResumenPanel({ params, plan }: ResumenPanelProps) {
  const organismos = new Set(plan.tramites.map((tramite) => tramite.organismo)).size;

  return (
    <aside className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
          Instalacion
        </p>
        <div>
          <ParamRow label="Tipo" value={TIPO_LABEL[params.tipo_instalacion] ?? params.tipo_instalacion} />
          <ParamRow label="CC. AA." value={COMUNIDAD_LABEL[params.comunidad] ?? params.comunidad} />
          <ParamRow label="Municipio" value={params.municipio} />
          <ParamRow label="Potencia" value={`${params.potencia_kw} kW`} />
          {params.numero_puntos && (
            <ParamRow label="Puntos de recarga" value={params.numero_puntos} />
          )}
          {params.modo_recarga && (
            <ParamRow label="Modo de recarga" value={`Modo ${params.modo_recarga}`} />
          )}
          {params.ubicacion_irve && (
            <ParamRow
              label="Ubicacion"
              value={params.ubicacion_irve.replace(/_/g, " ")}
            />
          )}
          {params.acceso_publico !== undefined && (
            <ParamRow
              label="Acceso"
              value={params.acceso_publico ? "Publico (TECI/MITECO)" : "Privado (PUES)"}
            />
          )}
          {params.solicita_ayuda && (
            <ParamRow label="Solicita ayuda" value="Si (MOVES III / Next Gen)" />
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
          Resumen del plan
        </p>
        <MetricRow label="Tramites en total" value={plan.tramites.length} />
        {plan.tiempo_total_estimado_dias !== null && (
          <MetricRow
            label="Tiempo estimado"
            value={`~${plan.tiempo_total_estimado_dias} dias`}
          />
        )}
        <MetricRow label="Organismos distintos" value={organismos} />
      </div>

      {plan.advertencias.length > 0 && (
        <div className="space-y-2">
          {plan.advertencias.map((advertencia, index) => (
            <div
              key={index}
              className="flex items-start gap-2.5 rounded-lg border border-warning bg-warning/10 px-3 py-2.5 text-xs leading-relaxed text-warning-dark"
            >
              <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" aria-hidden />
              {advertencia}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

`

# apps/web/components/plan-tramitacion/PlataformaBadge.tsx

`	sx
import { type Plataforma, PLATAFORMA_LABEL } from "@/types/plan";

const PLATAFORMA_STYLES: Record<
  NonNullable<Plataforma>,
  { bg: string; text: string; border: string }
> = {
  PUES: {
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
  },
  TECI: {
    bg: "bg-purple-50",
    text: "text-purple-800",
    border: "border-purple-200",
  },
  MITECO: {
    bg: "bg-teal-50",
    text: "text-teal-800",
    border: "border-teal-200",
  },
  distribuidora: {
    bg: "bg-neutral-100",
    text: "text-neutral-600",
    border: "border-neutral-200",
  },
  ayuntamiento: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
  },
};

interface PlataformaBadgeProps {
  plataforma: Plataforma;
}

export function PlataformaBadge({ plataforma }: PlataformaBadgeProps) {
  if (!plataforma) return null;

  const styles = PLATAFORMA_STYLES[plataforma];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${styles.bg} ${styles.text} ${styles.border}`}
    >
      {PLATAFORMA_LABEL[plataforma] ?? plataforma}
    </span>
  );
}

`

# apps/web/components/plan-tramitacion/DocumentosPanel.tsx

`	sx
"use client";

import { useState } from "react";
import Link from "next/link";
import { FileArchive, FileText, FileType2, ListChecks, Loader2 } from "lucide-react";

type TipoDocumento = "plan" | "checklist" | "mtd" | "dossier";

const VERTICALES_MTD = new Set(["fotovoltaica_autoconsumo", "irve"]);

interface DocumentosPanelProps {
  expedienteId: string;
  tipoInstalacion: string;
}

const BOTONES: Array<{
  tipo: TipoDocumento;
  label: string;
  icon: typeof FileText;
  soloMtd?: boolean;
}> = [
  { tipo: "plan", label: "Plan de tramitación (PDF)", icon: FileText },
  { tipo: "checklist", label: "Checklist documentación (PDF)", icon: ListChecks },
  { tipo: "mtd", label: "Borrador MTD (DOCX)", icon: FileType2, soloMtd: true },
  { tipo: "dossier", label: "Dossier completo (ZIP)", icon: FileArchive },
];

export function DocumentosPanel({ expedienteId, tipoInstalacion }: DocumentosPanelProps) {
  const [descargando, setDescargando] = useState<TipoDocumento | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requiereUpgrade, setRequiereUpgrade] = useState(false);

  const descargar = async (tipo: TipoDocumento) => {
    if (descargando) return;
    setDescargando(tipo);
    setError(null);
    setRequiereUpgrade(false);

    try {
      const res = await fetch(
        `/api/expedientes/${expedienteId}/documentos?tipo=${tipo}`
      );

      if (res.status === 402) {
        setRequiereUpgrade(true);
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Error ${res.status}`);
      }

      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="?([^";]+)"?/.exec(disposition);
      const filename = match?.[1] ?? `permitflow_${tipo}`;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el documento.");
    } finally {
      setDescargando(null);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
        <FileText size={11} aria-hidden />
        Documentos
      </p>

      <div className="flex flex-col gap-2">
        {BOTONES.filter(
          (b) => !b.soloMtd || VERTICALES_MTD.has(tipoInstalacion)
        ).map(({ tipo, label, icon: Icon }) => (
          <button
            key={tipo}
            onClick={() => descargar(tipo)}
            disabled={descargando !== null}
            className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2 text-left text-xs text-text-primary transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {descargando === tipo ? (
              <Loader2 size={13} className="animate-spin" aria-hidden />
            ) : (
              <Icon size={13} aria-hidden />
            )}
            {label}
          </button>
        ))}
      </div>

      {requiereUpgrade && (
        <p className="mt-3 rounded-lg bg-warning-light px-3 py-2 text-xs text-warning-dark">
          La generación de documentos es una función del plan Pro.{" "}
          <Link href="/#precios" className="font-medium underline">
            Ver planes
          </Link>
        </p>
      )}
      {error && <p className="mt-3 text-xs text-danger-dark">{error}</p>}
    </div>
  );
}

`

# apps/web/components/plan-tramitacion/ValidadorPanel.tsx

`	sx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RotateCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { ValidacionResultado } from "@/types/plan";

interface ValidadorPanelProps {
  expedienteId: string;
}

export function ValidadorPanel({ expedienteId }: ValidadorPanelProps) {
  const [resultado, setResultado] = useState<ValidacionResultado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiereUpgrade, setRequiereUpgrade] = useState(false);

  const validar = useCallback(async () => {
    setCargando(true);
    setError(null);
    setRequiereUpgrade(false);
    try {
      const res = await fetch(`/api/expedientes/${expedienteId}/validar`);
      if (res.status === 402) {
        setRequiereUpgrade(true);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as
        | ValidacionResultado
        | { error?: string };
      if (!res.ok) {
        throw new Error(("error" in data && data.error) || `Error ${res.status}`);
      }
      setResultado(data as ValidacionResultado);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo validar.");
    } finally {
      setCargando(false);
    }
  }, [expedienteId]);

  useEffect(() => {
    void validar();
  }, [validar]);

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
          <ShieldCheck size={11} aria-hidden />
          Validación pre-presentación
        </p>
        <button
          onClick={() => void validar()}
          disabled={cargando}
          title="Volver a validar"
          className="text-text-secondary transition-colors hover:text-primary disabled:opacity-40"
        >
          {cargando ? (
            <Loader2 size={13} className="animate-spin" aria-hidden />
          ) : (
            <RotateCw size={13} aria-hidden />
          )}
        </button>
      </div>

      {requiereUpgrade && (
        <p className="rounded-lg bg-warning-light px-3 py-2 text-xs text-warning-dark">
          El validador es una función del plan Pro.{" "}
          <Link href="/#precios" className="font-medium underline">
            Ver planes
          </Link>
        </p>
      )}

      {error && <p className="text-xs text-danger-dark">{error}</p>}

      {resultado && !cargando && (
        <>
          {resultado.total_definidas === 0 ? (
            <p className="text-xs text-text-secondary">
              Aún no hay comprobaciones definidas para este vertical y comunidad.
            </p>
          ) : resultado.hallazgos.length === 0 ? (
            <p className="flex items-center gap-1.5 text-xs text-success-dark">
              <CheckCircle2 size={13} aria-hidden />
              Sin incidencias · {resultado.total_definidas} comprobaciones superadas
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {resultado.hallazgos.map((h) => (
                <li
                  key={h.id}
                  className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
                    h.severidad === "error"
                      ? "bg-danger-light text-danger-dark"
                      : "bg-warning-light text-warning-dark"
                  }`}
                >
                  <span className="mb-0.5 flex items-center gap-1 font-medium">
                    {h.severidad === "error" ? (
                      <XCircle size={12} aria-hidden />
                    ) : (
                      <AlertTriangle size={12} aria-hidden />
                    )}
                    {h.severidad === "error" ? "Error" : "Aviso"}
                  </span>
                  {h.mensaje}
                  {h.fuente && (
                    <span className="mt-1 block text-[10px] italic opacity-80">
                      Fuente: {h.fuente}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {resultado.no_evaluables.length > 0 && (
            <p className="mt-2 text-[10px] text-text-secondary">
              {resultado.no_evaluables.length} comprobación(es) no evaluables — revisar
              JSON de normativa.
            </p>
          )}
        </>
      )}
    </div>
  );
}

`

# apps/web/components/plan-tramitacion/TimelinePlan.tsx

`	sx
"use client";

import type { Tramite, TramitesEstadoMap } from "@/types/plan";
import { calcularTimeline } from "@/lib/timeline";

interface TimelinePlanProps {
  tramites: Tramite[];
  estados?: TramitesEstadoMap;
  tiempoSerie?: number | null;
}

function colorBarra(estado?: string, paralelo?: boolean) {
  if (estado === "completado") return "bg-success";
  if (estado === "en_curso") return "bg-warning";
  return paralelo ? "bg-primary/50" : "bg-primary/80";
}

export function TimelinePlan({ tramites, estados = {}, tiempoSerie }: TimelinePlanProps) {
  if (tramites.length < 2) return null;

  const { slots, duracionCritica, duracionSerie } = calcularTimeline(tramites);
  const total = Math.max(duracionCritica, 1);
  const serie = tiempoSerie ?? duracionSerie;
  const ahorro = serie - duracionCritica;

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
          Línea temporal estimada
        </p>
        <p className="text-xs text-text-secondary">
          {ahorro > 0 ? (
            <>
              Camino crítico:{" "}
              <span className="font-medium text-text-primary">{duracionCritica} días</span>
              {" · en serie: "}{serie} días{" · "}
              <span className="text-success-dark">−{ahorro}d por trámites en paralelo</span>
            </>
          ) : (
            <>
              <span className="font-medium text-text-primary">{duracionCritica} días</span>
              {" en serie"}
            </>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        {slots.map((slot) => {
          const left = (slot.inicioDia / total) * 100;
          const width = Math.max((slot.duracion / total) * 100, 1.5);
          const estado = estados[String(slot.orden)]?.estado;
          return (
            <div key={slot.orden} className="flex items-center gap-2">
              <span className="w-32 flex-shrink-0 truncate text-[10px] text-text-secondary sm:w-44">
                {slot.orden}. {slot.nombre}
              </span>
              <div className="relative h-3.5 flex-1 overflow-hidden rounded-full bg-bg">
                <div
                  className={`absolute top-0 h-full rounded-full ${colorBarra(estado, slot.paralelo)}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={`Día ${slot.inicioDia} → ${slot.finDia} (${slot.duracion}d)${
                    slot.paralelo ? " · en paralelo" : ""
                  }`}
                />
              </div>
              <span className="w-10 flex-shrink-0 text-right text-[10px] tabular-nums text-text-secondary">
                {slot.duracion}d
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex justify-between text-[10px] text-text-secondary">
        <span>Día 0</span>
        <span>Día {duracionCritica}</span>
      </div>
    </div>
  );
}

`

# apps/web/components/plan-tramitacion/DetallesExpediente.tsx

`	sx
"use client";

import { useState } from "react";
import { Check, Loader2, Pencil } from "lucide-react";

interface DetallesExpedienteProps {
  expedienteId: string;
  referenciaCliente: string | null;
  notas: string | null;
}

export function DetallesExpediente({
  expedienteId,
  referenciaCliente,
  notas,
}: DetallesExpedienteProps) {
  const [referencia, setReferencia] = useState(referenciaCliente ?? "");
  const [notasTexto, setNotasTexto] = useState(notas ?? "");
  const [guardado, setGuardado] = useState({
    referencia: referenciaCliente ?? "",
    notas: notas ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const dirty =
    referencia !== guardado.referencia || notasTexto !== guardado.notas;

  const handleGuardar = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const res = await fetch(`/api/expedientes/${expedienteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referencia_cliente: referencia.trim() || null,
          notas: notasTexto.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setGuardado({ referencia, notas: notasTexto });
      setOk(true);
      setTimeout(() => setOk(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
        <Pencil size={11} aria-hidden />
        Cliente y notas
      </p>

      <label className="mb-3 block">
        <span className="mb-1 block text-xs text-text-secondary">
          Referencia de cliente
        </span>
        <input
          value={referencia}
          onChange={(e) => setReferencia(e.target.value)}
          maxLength={120}
          placeholder="Ej: Comunidad Calle Feria 12"
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary/20"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-text-secondary">
          Notas internas
        </span>
        <textarea
          value={notasTexto}
          onChange={(e) => setNotasTexto(e.target.value)}
          maxLength={4000}
          rows={3}
          placeholder="Incidencias, contactos, subsanaciones…"
          className="w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary/20"
        />
      </label>

      {error && <p className="mt-2 text-xs text-danger-dark">{error}</p>}

      <div className="mt-3 flex items-center justify-end gap-2">
        {ok && (
          <span className="flex items-center gap-1 text-xs text-success-dark">
            <Check size={12} aria-hidden /> Guardado
          </span>
        )}
        <button
          onClick={handleGuardar}
          disabled={!dirty || saving}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {saving && <Loader2 size={12} className="animate-spin" aria-hidden />}
          Guardar
        </button>
      </div>
    </div>
  );
}

`

# apps/web/components/plan-tramitacion/AlertasExpedienteBanner.tsx

`	sx
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { DbAlertaBoe } from "@/lib/supabase";

export function AlertasExpedienteBanner({ alertas }: { alertas: DbAlertaBoe[] }) {
  if (alertas.length === 0) return null;

  return (
    <div className="border-b border-warning/30 bg-warning-light px-4 py-2.5 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 text-xs text-warning-dark">
        <AlertTriangle size={13} className="flex-shrink-0" aria-hidden />
        <span className="font-medium">
          {alertas.length === 1
            ? "1 alerta normativa sin leer afecta a este expediente:"
            : `${alertas.length} alertas normativas sin leer afectan a este expediente:`}
        </span>
        <span className="min-w-0 flex-1 truncate">{alertas[0].titulo}</span>
        <Link href="/alertas" className="flex-shrink-0 font-medium underline">
          Ver alertas →
        </Link>
      </div>
    </div>
  );
}

`

# apps/web/app/globals.css

`	sx
@import "./print.css";

@tailwind base;
@tailwind components;
@tailwind utilities;

/* Fuentes locales (ya están en apps/web/app/fonts/) */
@font-face {
  font-family: "GeistMono";
  src: url("/fonts/GeistMonoVF.woff") format("woff");
  font-weight: 100 900;
  font-display: swap;
}

@layer base {
  :root {
    --color-primary: #1B4FD8;
    --color-primary-dark: #1340B0;
    --color-primary-light: #EEF3FE;
    --color-bg: #F9FAFB;
    --color-surface: #ffffff;
    --color-border: #E5E7EB;
    --color-text-primary: #111827;
    --color-text-secondary: #6B7280;
  }

  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    @apply bg-bg text-text-primary;
  }

  /* Foco visible accesible */
  *:focus-visible {
    outline: 2px solid #1B4FD8;
    outline-offset: 2px;
    border-radius: 4px;
  }
}

@layer utilities {
  /* Ocultar scrollbar manteniendo funcionalidad */
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}

`

# tailwind.config.ts

(Archivo no encontrado)

# apps/web/tailwind.config.ts

`	sx
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Marca principal
        primary: {
          DEFAULT: "#1B4FD8",
          dark: "#1340B0",
          light: "#EEF3FE",
        },
        // Estados semánticos
        success: {
          DEFAULT: "#16A34A",
          light: "#EAF3DE",
          dark: "#3B6D11",
        },
        warning: {
          DEFAULT: "#D97706",
          light: "#FAEEDA",
          dark: "#633806",
        },
        danger: {
          DEFAULT: "#DC2626",
          light: "#FCEBEB",
          dark: "#791F1F",
        },
        // Plataformas de tramitación
        plataforma: {
          pues: {
            bg: "#EEF3FE",
            text: "#1340B0",
            border: "#B5D4F4",
          },
          teci: {
            bg: "#EEEDFE",
            text: "#3C3489",
            border: "#AFA9EC",
          },
          miteco: {
            bg: "#E1F5EE",
            text: "#085041",
            border: "#5DCAA5",
          },
        },
        // Superficie y texto (usados como alias semánticos)
        neutral: "#6B7280",
        bg: "#F9FAFB",
        surface: "#FFFFFF",
        border: "#E5E7EB",
        text: {
          primary: "#111827",
          secondary: "#6B7280",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["GeistMono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        "2xs": ["11px", { lineHeight: "16px" }],
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
      },
      maxWidth: {
        "8xl": "88rem",
      },
    },
  },
  plugins: [],
};

export default config;

`

