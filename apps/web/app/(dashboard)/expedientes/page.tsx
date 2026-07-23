import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ExpedientesTable } from "@/components/dashboard/ExpedientesTable";
import { KpiGrid } from "@/components/dashboard/KpiGrid";
import { listarExpedientes, obtenerKpis } from "@/lib/expedientes";
import {
  PlazosActivos,
  type ExpedienteEstancado,
  type PlazoActivo,
} from "@/components/dashboard/PlazosActivos";
import { diasEntre, hoyIso } from "@/lib/plazos";
import { calcularVencimientoHabil } from "@/lib/festivos";

export default async function ExpedientesPage() {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/sign-in");
  }

  const dbExpedientes = await listarExpedientes(orgId);
  const kpis = obtenerKpis(dbExpedientes);

  const expedientesUI = dbExpedientes.map((expediente) => ({
    id: expediente.id,
    tipo_instalacion: expediente.tipo_instalacion,
    comunidad: expediente.comunidad,
    municipio: expediente.municipio,
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
  const hoy = hoyIso();

  for (const expediente of dbExpedientes) {
    const etiqueta = expediente.referencia_cliente ?? expediente.municipio;
    const estadosMap = expediente.tramites_estado ?? {};
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
  const plazosTop = plazos.slice(0, 5);
  const estancadosTop = estancados.slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-medium text-text-primary">Expedientes</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            {expedientesUI.length === 0
              ? "Aun no has generado ningun plan de tramitacion."
              : `${expedientesUI.length} expedientes activos.`}
          </p>
        </div>
        <Link
          href="/nueva-instalacion"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus size={15} aria-hidden />
          Nueva instalacion
        </Link>
      </div>

      <PlazosActivos plazos={plazosTop} estancados={estancadosTop} />

      <div className="mb-6">
        <KpiGrid kpis={kpis} />
      </div>

      <ExpedientesTable expedientes={expedientesUI} />
    </div>
  );
}
