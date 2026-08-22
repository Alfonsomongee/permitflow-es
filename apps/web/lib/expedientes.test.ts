import { describe, expect, it } from "vitest";

import { payloadDuplicado } from "./expedientes";
import type { DbExpediente } from "./supabase";

function expediente(overrides: Partial<DbExpediente> = {}): DbExpediente {
  return {
    id: "orig-1",
    org_id: "org-1",
    clerk_user_id: "user-1",
    tipo_instalacion: "fotovoltaica_autoconsumo",
    comunidad: "andalucia",
    potencia_kw: 5,
    uso: "residencial",
    numero_puntos: null,
    modo_recarga: null,
    acceso_publico: null,
    ubicacion_irve: null,
    requiere_nuevo_suministro: null,
    combustible: null,
    presion_bar: null,
    solicita_ayuda: false,
    plan_tramitacion: {
      tramites: [],
      tiempo_total_estimado_dias: 30,
      advertencias: [],
    },
    tiempo_total_dias: 30,
    estado: "aprobado",
    fase_comercial: "aprobado",
    tramites_completados: 5,
    tramites_estado: { "1": { estado: "completado", fecha_inicio: "2026-01-01", fecha_completado: "2026-01-10" } },
    referencia_cliente: "Cliente Original S.L.",
    notas: "Notas del proyecto original",
    version: 3,
    share_token: "abc-123",
    creado_en: "2026-01-01T00:00:00Z",
    actualizado_en: "2026-02-01T00:00:00Z",
    ...overrides,
  };
}

describe("payloadDuplicado", () => {
  it("copia los campos técnicos de clasificación tal cual", () => {
    const original = expediente();
    const payload = payloadDuplicado(original);
    expect(payload.tipo_instalacion).toBe(original.tipo_instalacion);
    expect(payload.comunidad).toBe(original.comunidad);
    expect(payload.potencia_kw).toBe(original.potencia_kw);
    expect(payload.uso).toBe(original.uso);
    expect(payload.plan_tramitacion).toEqual(original.plan_tramitacion);
    expect(payload.tiempo_total_dias).toBe(original.tiempo_total_dias);
  });

  it("reinicia el progreso: estado, trámites completados y tramites_estado", () => {
    const original = expediente({
      estado: "aprobado",
      tramites_completados: 5,
      tramites_estado: { "1": { estado: "completado", fecha_inicio: "x", fecha_completado: "y" } },
    });
    const payload = payloadDuplicado(original);
    expect(payload.estado).toBe("borrador");
    expect(payload.fase_comercial).toBe("clasificado");
    expect(payload.tramites_completados).toBe(0);
    expect(payload.tramites_estado).toEqual({});
  });

  it("vacía referencia_cliente y notas en vez de arrastrarlas del original", () => {
    const original = expediente({
      referencia_cliente: "Cliente Original S.L.",
      notas: "Notas privadas del proyecto original",
    });
    const payload = payloadDuplicado(original);
    expect(payload.referencia_cliente).toBeNull();
    expect(payload.notas).toBeNull();
  });

  it("no incluye id, org_id, version, share_token ni fechas del original", () => {
    const original = expediente();
    const payload = payloadDuplicado(original);
    expect(payload).not.toHaveProperty("id");
    expect(payload).not.toHaveProperty("org_id");
    expect(payload).not.toHaveProperty("version");
    expect(payload).not.toHaveProperty("share_token");
    expect(payload).not.toHaveProperty("creado_en");
    expect(payload).not.toHaveProperty("actualizado_en");
  });
});
