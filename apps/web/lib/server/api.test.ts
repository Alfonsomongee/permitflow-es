import { describe, expect, it } from "vitest";
import { cabecerasInternas, ipCliente } from "./api";

const req = (h: Record<string, string>) => new Request("https://x.test", { headers: h });

describe("ipCliente", () => {
  it("toma la primera IP de x-forwarded-for", () => {
    expect(ipCliente(req({ "x-forwarded-for": "88.1.2.3, 10.0.0.1" }))).toBe("88.1.2.3");
  });
  it("cae a x-real-ip", () => {
    expect(ipCliente(req({ "x-real-ip": "5.5.5.5" }))).toBe("5.5.5.5");
  });
  it("devuelve undefined sin cabeceras", () => {
    expect(ipCliente(req({}))).toBeUndefined();
  });
});

describe("cabecerasInternas", () => {
  it("incluye la IP del visitante y las cabeceras extra", () => {
    const h = cabecerasInternas(req({ "x-forwarded-for": "9.9.9.9" }), { "Content-Type": "application/json" });
    expect(h["X-Client-IP"]).toBe("9.9.9.9");
    expect(h["Content-Type"]).toBe("application/json");
    expect("X-Internal-Key" in h).toBe(true);
  });
  it("sin petición no añade X-Client-IP", () => {
    expect("X-Client-IP" in cabecerasInternas()).toBe(false);
  });
});
