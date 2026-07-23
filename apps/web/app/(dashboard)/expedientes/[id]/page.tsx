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
          version: expediente.version,
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
