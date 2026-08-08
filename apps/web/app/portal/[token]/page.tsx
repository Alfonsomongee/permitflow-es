/**
 * apps/web/app/portal/[token]/page.tsx
 *
 * Portal de cliente final: vista pública de un expediente, sin necesidad de
 * cuenta. El enlace lo genera el instalador/gestoría desde PortalClienteCard
 * (panel del expediente) y usa un token opaco (UUID aleatorio) como única
 * credencial — no hay login ni cookie de sesión aquí.
 *
 * Desde 2026-08-08 no es puramente de solo lectura: el propietario puede
 * subir documentación pendiente por trámite (ver PortalTramitesList /
 * DocumentoUploadControl), primera pieza del portal bidireccional. Sigue
 * sin exponer notas internas, historial de auditoría ni validación
 * normativa -- eso sigue siendo exclusivo de PlanTramitacionView.
 */
import { notFound } from "next/navigation";
import { Building2, CalendarClock, MapPin, ShieldCheck, Zap } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import { TIPO_LABEL, COMUNIDAD_LABEL, type PlanTramitacion, type TramitesEstadoMap } from "@/types/plan";
import { TimelinePlan } from "@/components/plan-tramitacion/TimelinePlan";
import { PortalTramitesList } from "@/components/plan-tramitacion/PortalTramitesList";
import type { DocumentoSubidoResumen } from "@/components/plan-tramitacion/DocumentoUploadControl";

export const dynamic = "force-dynamic";

const ESTADO_LABEL: Record<string, string> = {
  borrador: "Borrador",
  pendiente: "En trámite",
  en_revision: "En revisión",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

async function obtenerExpedientePorToken(token: string) {
  // UUID inválido no puede coincidir con ninguna fila: evita una consulta
  // innecesaria (y ruido en logs) ante bots probando rutas al azar.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(token)) return null;

  const { data } = await supabaseAdmin
    .from("expedientes")
    .select(
      "id, tipo_instalacion, comunidad, potencia_kw, estado, plan_tramitacion, tramites_estado, tramites_completados, actualizado_en"
    )
    .eq("share_token", token)
    .maybeSingle();

  return data;
}

async function obtenerDocumentosSubidos(expedienteId: string): Promise<DocumentoSubidoResumen[]> {
  const { data } = await supabaseAdmin
    .from("documentos_cliente")
    .select("id, tramite_orden, documento_id, nombre_original, subido_en")
    .eq("expediente_id", expedienteId)
    .order("subido_en", { ascending: false });
  return data ?? [];
}

export default async function PortalClientePage({
  params,
}: {
  params: { token: string };
}) {
  const expediente = await obtenerExpedientePorToken(params.token);
  if (!expediente) notFound();

  const documentosSubidos = await obtenerDocumentosSubidos(expediente.id);

  const plan = expediente.plan_tramitacion as PlanTramitacion | null;
  const estados = (expediente.tramites_estado ?? {}) as TramitesEstadoMap;
  const tramites = plan?.tramites ?? [];
  const tramitesAccionables = tramites.filter(
    (t) => t.tipo_actuacion === "accion_usuario" || t.tipo_actuacion === undefined
  );
  const progreso =
    tramitesAccionables.length > 0
      ? Math.round((expediente.tramites_completados / tramitesAccionables.length) * 100)
      : 0;

  const titulo = TIPO_LABEL[expediente.tipo_instalacion] ?? expediente.tipo_instalacion;
  const ccaa = COMUNIDAD_LABEL[expediente.comunidad] ?? expediente.comunidad;

  return (
    <div className="min-h-screen bg-bg">
      <div className="border-b border-border bg-surface px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-2 text-sm font-semibold text-text-primary">
          <ShieldCheck size={16} className="text-primary" aria-hidden />
          PermitFlow — Seguimiento de instalación
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary-light via-surface to-surface p-6">
          <span className="mb-1 inline-block rounded-full bg-surface/80 px-2.5 py-0.5 text-[11px] font-medium text-text-secondary">
            {ESTADO_LABEL[expediente.estado] ?? expediente.estado}
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">{titulo}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-text-secondary">
            <span className="flex items-center gap-1">
              <MapPin size={13} aria-hidden />
              {ccaa}
            </span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1 font-medium">
              <Zap size={13} aria-hidden />
              {expediente.potencia_kw} kW
            </span>
          </p>

          <div className="mt-4 flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface/80">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progreso}%` }}
              />
            </div>
            <span className="flex-shrink-0 text-sm font-semibold text-text-primary">{progreso}%</span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            {expediente.tramites_completados} de {tramitesAccionables.length} trámites completados
          </p>
        </div>

        {tramites.length >= 2 && (
          <div className="mb-6">
            <TimelinePlan tramites={tramites} estados={estados} tiempoSerie={plan?.tiempo_total_estimado_dias} />
          </div>
        )}

        <PortalTramitesList
          tramites={tramitesAccionables}
          estados={estados}
          comunidad={expediente.comunidad}
          token={params.token}
          subidosIniciales={documentosSubidos}
        />

        <div className="mt-8 flex items-start gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-text-secondary">
          <CalendarClock size={14} className="mt-0.5 flex-shrink-0" aria-hidden />
          <p>
            Enlace compartido por tu instalador o gestoría a través de
            PermitFlow. Puedes adjuntar la documentación pendiente en cada
            trámite. Los plazos son estimaciones orientativas y pueden
            variar según el organismo tramitador.
          </p>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-text-secondary">
          <Building2 size={12} aria-hidden />
          Gestionado con PermitFlow ES
        </div>
      </main>
    </div>
  );
}
