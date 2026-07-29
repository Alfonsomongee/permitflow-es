import { describe, expect, it } from "vitest";
import { calcularNotificacionesPlazos, UMBRAL_PROXIMO_DIAS } from "./notificaciones";
import { hoyIso } from "./plazos";
import type { PlanTramitacion, TramitesEstadoMap } from "@/types/plan";

function offsetDias(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function planConTramite(plazoLegalDias: number | null): PlanTramitacion {
  return {
    tramites: [
      {
        orden: 1,
        nombre: "Solicitud CAU",
        organismo: "Distribuidora",
        base_legal: "RD 244/2019",
        plazo_estimado_dias: plazoLegalDias,
        plazo_legal_dias: plazoLegalDias,
        documentos_requeridos: [],
        notas: null,
        plataforma: null,
        plataforma_url: null,
        coste_estimado: null,
      },
    ],
    tiempo_total_estimado_dias: plazoLegalDias,
    advertencias: [],
  };
}

function estadosEnCurso(fechaInicio: string): TramitesEstadoMap {
  return {
    "1": { estado: "en_curso", fecha_inicio: fechaInicio, fecha_completado: null },
  };
}

describe("calcularNotificacionesPlazos", () => {
  it("marca como vencido un trámite cuyo plazo ya pasó", () => {
    const inicioLejano = offsetDias(hoyIso(), -60);
    const resultado = calcularNotificacionesPlazos([
      {
        id: "exp-1",
        org_id: "org-1",
        comunidad: "andalucia",
        plan_tramitacion: planConTramite(5),
        tramites_estado: estadosEnCurso(inicioLejano),
      },
    ]);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].tipo).toBe("plazo_vencido");
    expect(resultado[0].expedienteId).toBe("exp-1");
    expect(resultado[0].orgId).toBe("org-1");
    expect(resultado[0].diasRestantes).toBeLessThan(0);
  });

  it("marca como próximo un trámite que vence dentro del umbral", () => {
    const resultado = calcularNotificacionesPlazos([
      {
        id: "exp-2",
        org_id: "org-1",
        comunidad: "andalucia",
        plan_tramitacion: planConTramite(1),
        tramites_estado: estadosEnCurso(hoyIso()),
      },
    ]);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].tipo).toBe("plazo_proximo");
    expect(resultado[0].diasRestantes).toBeGreaterThanOrEqual(0);
    expect(resultado[0].diasRestantes).toBeLessThanOrEqual(UMBRAL_PROXIMO_DIAS);
  });

  it("no notifica un trámite con plazo lejano", () => {
    const resultado = calcularNotificacionesPlazos([
      {
        id: "exp-3",
        org_id: "org-1",
        comunidad: "andalucia",
        plan_tramitacion: planConTramite(60),
        tramites_estado: estadosEnCurso(hoyIso()),
      },
    ]);

    expect(resultado).toHaveLength(0);
  });

  it("no notifica trámites pendientes o completados (no en_curso)", () => {
    const plan = planConTramite(1);
    const resultado = calcularNotificacionesPlazos([
      {
        id: "exp-4",
        org_id: "org-1",
        comunidad: "andalucia",
        plan_tramitacion: plan,
        tramites_estado: {
          "1": { estado: "completado", fecha_inicio: hoyIso(), fecha_completado: hoyIso() },
        },
      },
      {
        id: "exp-5",
        org_id: "org-1",
        comunidad: "andalucia",
        plan_tramitacion: plan,
        tramites_estado: {},
      },
    ]);

    expect(resultado).toHaveLength(0);
  });

  it("ignora trámites sin plazo_legal_dias definido", () => {
    const resultado = calcularNotificacionesPlazos([
      {
        id: "exp-6",
        org_id: "org-1",
        comunidad: "andalucia",
        plan_tramitacion: planConTramite(null),
        tramites_estado: estadosEnCurso(hoyIso()),
      },
    ]);

    expect(resultado).toHaveLength(0);
  });
});
