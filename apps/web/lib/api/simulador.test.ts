import { afterEach, describe, expect, it, vi } from "vitest";
import { generateSimulation } from "./simulador";

// Regresión: el 2026-08-07 se detectó que generateSimulation() enviaba
// { direccion, superficieDisponible, presupuesto, interesadoEnBaterias,
// facturaId }, un payload que GenerarRequest (apps/api/routers/simulador.py)
// nunca ha aceptado -- analisis_id es un campo obligatorio sin valor por
// defecto, así que toda petición real devolvía 422 y el botón "Calcular
// Ahorro" del simulador estaba roto para el 100% de los usuarios. Este test
// fija el contrato real (analisis_id / tipo_inmueble / region / lat / lon)
// para que una futura regresión de este tipo falle aquí en vez de en
// producción.
describe("generateSimulation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("envía el payload con las claves que espera GenerarRequest en el backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ estudio_id: "abc", token: "tok" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await generateSimulation({
      analisisId: "factura-123",
      tipoInmueble: "vivienda_unifamiliar",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/simulador/generar");

    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toEqual({
      analisis_id: "factura-123",
      tipo_inmueble: "vivienda_unifamiliar",
      region: undefined,
      lat: undefined,
      lon: undefined,
    });
    // Los campos que el backend nunca ha aceptado no deben reaparecer.
    expect(body).not.toHaveProperty("facturaId");
    expect(body).not.toHaveProperty("direccion");
    expect(body).not.toHaveProperty("superficieDisponible");
    expect(body).not.toHaveProperty("presupuesto");
    expect(body).not.toHaveProperty("interesadoEnBaterias");
  });

  it("incluye region/lat/lon cuando se proporcionan", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ estudio_id: "abc", token: "tok" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await generateSimulation({
      analisisId: "factura-123",
      tipoInmueble: "vivienda_unifamiliar",
      region: "andalucia",
      lat: 37.3,
      lon: -5.9,
    });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.region).toBe("andalucia");
    expect(body.lat).toBe(37.3);
    expect(body.lon).toBe(-5.9);
  });
});
