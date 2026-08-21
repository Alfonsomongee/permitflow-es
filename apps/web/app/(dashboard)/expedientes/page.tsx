import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ExpedientesTable } from "@/components/dashboard/ExpedientesTable";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { listarExpedientes, obtenerKpis } from "@/lib/expedientes";
import {
  PlazosActivos,
  type ExpedienteEstancado,
  type PlazoActivo,
} from "@/components/dashboard/PlazosActivos";
import {
  SilencioAdministrativoResumen,
  type SilencioResumenItem,
} from "@/components/dashboard/SilencioAdministrativoResumen";
import { diasEntre, hoyIso } from "@/lib/plazos";
import { calcularVencimientoHabil } from "@/lib/festivos";
import { detectarSilenciosVencidos } from "@/lib/silencioAdministrativo";

export default async function ExpedientesPage({
  searchParams,
}: {
  searchParams: { buscar?: string };
}) {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/sign-in");
  }

  const { buscar } = searchParams;

  const dbExpedientes = await listarExpedientes(orgId);
  const kpis = obtenerKpis(dbExpedientes);

  const expedientesUI = dbExpedientes.map((expediente) => ({
    id: expediente.id,
    tipo_instalacion: expediente.tipo_instalacion,
    comunidad: expediente.comunidad,
    potencia_kw: expediente.potencia_kw,
    estado: expediente.estado,
    tramites_total: expediente.plan_tramitacion?.tramites?.length ?? 0,
    tramites_completados: expediente.tramites_completados,
    fecha_creacion: expediente.creado_en,
    fecha_actualizacion: expediente.actualizado_en,
    cliente: expediente.referencia_cliente ?? undefined,
  }));

  // ── Plazos legales en curso + expedientes sin movimiento ────────────────
  const plazos: PlazoActivo[] = [];
  const estancados: ExpedienteEstancado[] = [];
  const silencios: SilencioResumenItem[] = [];
  const hoy = hoyIso();

  for (const expediente of dbExpedientes) {
    const etiqueta = expediente.referencia_cliente ?? expediente.tipo_instalacion;
    const estadosMap = expediente.tramites_estado ?? {};

    for (const detectado of detectarSilenciosVencidos(
      expediente.plan_tramitacion?.tramites ?? [],
      estadosMap,
      expediente.comunidad
    )) {
      silencios.push({
        expedienteId: expediente.id,
        etiqueta,
        nombreTramite: detectado.nombreTramite,
        efecto: detectado.efecto,
        diasVencido: detectado.diasVencido,
      });
    }
    const enCurso = Object.entries(estadosMap).filter(
      ([, info]) => info.estado === "en_curso" && info.fecha_inicio
    );

    for (const [orden, info] of enCurso) {
      const tramite = expediente.plan_tramitacion?.tramites?.find(
        (t) => t.orden === Number(orden)
      );
      if (!tramite?.plazo_legal_dias || !info.fecha_inicio) continue;
      const { fechaVencimiento } = calcularVencimientoHabil(
        info.fecha_inicio,
        tramite.plazo_legal_dias,
        expediente.comunidad
      );
      plazos.push({
        expedienteId: expediente.id,
        etiqueta,
        tramiteNombre: tramite.nombre,
        plazoLegal: tramite.plazo_legal_dias,
        diasRestantes: diasEntre(hoy, fechaVencimiento),
      });
    }

    const sinMovimiento = diasEntre(expediente.actualizado_en.slice(0, 10), hoy);
    const activo =
      expediente.estado === "pendiente" || expediente.estado === "en_revision";
    if (activo && enCurso.length === 0 && sinMovimiento >= 10) {
      estancados.push({
        expedienteId: expediente.id,
        etiqueta,
        diasSinMovimiento: sinMovimiento,
      });
    }
  }

  plazos.sort((a, b) => a.diasRestantes - b.diasRestantes);
  estancados.sort((a, b) => b.diasSinMovimiento - a.diasSinMovimiento);
  silencios.sort((a, b) => b.diasVencido - a.diasVencido);
  const plazosTop = plazos.slice(0, 5);
  const estancadosTop = estancados.slice(0, 3);
  const silenciosTop = silencios.slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-medium text-text-primary">Expedientes</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            {expedientesUI.length === 0
              ? "Aún no has generado ningún plan de tramitación."
              : `${expedientesUI.length} expedientes activos.`}
          </p>
        </div>
        <Link href="/nueva-instalacion" className={buttonVariants({ variant: "default" })}>
          <Plus size={15} aria-hidden />
          Nueva instalación
        </Link>
      </div>

      <SilencioAdministrativoResumen items={silenciosTop} />
      <PlazosActivos plazos={plazosTop} estancados={estancadosTop} />

      <div className="mb-6">
        <KpiCards
          items={[
            { label: "Total expedientes", value: kpis.total },
            {
              label: "En tramitación",
              value: kpis.en_tramitacion,
              subtext: "Pendiente + En revisión",
              accent: "warning",
            },
            {
              label: "Aprobados",
              value: kpis.aprobados,
              subtext: "Tramitación completada",
              accent: "success",
            },
            {
              label: "Borradores",
              value: kpis.borradores,
              subtext: "Sin enviar",
              accent: "primary",
            },
          ]}
        />
      </div>

      <ExpedientesTable expedientes={expedientesUI} initialQuery={buscar ?? ""} />
    </div>
  );
}
