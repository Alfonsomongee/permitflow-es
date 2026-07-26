import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { PlanTramitacionView } from "@/components/plan-tramitacion";
import { obtenerExpediente } from "@/lib/expedientes";
import { alertasNoLeidasParaExpediente } from "@/lib/alertas";
import { AlertasExpedienteBanner } from "@/components/plan-tramitacion/AlertasExpedienteBanner";
import type { InstalacionParams } from "@/types/plan";

interface PageProps {
  params: {
    id: string;
  };
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
          version: expediente.version,
        }}
      />
    </>
  );
}
