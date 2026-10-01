import { describe, expect, it } from "vitest";
import { evaluarCuotaClasificaciones, inicioDeMes, tieneAccesoPro } from "./planes";

describe("tieneAccesoPro", () => {
  it("Free sin suscripción no tiene acceso", () => {
    expect(tieneAccesoPro({ plan: "free", suscripcion_activa: false })).toBe(false);
    expect(tieneAccesoPro(null)).toBe(false);
  });
  it("suscripción activa o Enterprise sí", () => {
    expect(tieneAccesoPro({ plan: "pro", suscripcion_activa: true })).toBe(true);
    expect(tieneAccesoPro({ plan: "enterprise", suscripcion_activa: false })).toBe(true);
  });
});

describe("evaluarCuotaClasificaciones", () => {
  const free = { plan: "free", suscripcion_activa: false };
  it("Free: permite hasta 4 y bloquea a partir de 5", () => {
    expect(evaluarCuotaClasificaciones(free, 4).limitado).toBe(false);
    expect(evaluarCuotaClasificaciones(free, 5).limitado).toBe(true);
    expect(evaluarCuotaClasificaciones(free, 12).limitado).toBe(true);
  });
  it("Pro: ilimitado", () => {
    const r = evaluarCuotaClasificaciones({ plan: "pro", suscripcion_activa: true }, 500);
    expect(r).toEqual({ limitado: false, usadas: 500, limite: null });
  });
  it("organización desconocida se trata como Free", () => {
    expect(evaluarCuotaClasificaciones(null, 5).limitado).toBe(true);
  });
});

describe("inicioDeMes", () => {
  it("devuelve el día 1 a las 00:00 UTC", () => {
    expect(inicioDeMes(new Date("2026-10-17T15:30:00Z"))).toBe("2026-10-01T00:00:00.000Z");
    expect(inicioDeMes(new Date("2026-12-31T23:59:59Z"))).toBe("2026-12-01T00:00:00.000Z");
  });
});
