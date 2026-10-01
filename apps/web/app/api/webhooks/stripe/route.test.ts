import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Dobles ────────────────────────────────────────────────────────────────
const registros: Array<{ id: string; tipo: string }> = [];
const actualizaciones: Array<Record<string, unknown>> = [];
let errorEnUpdate: { message: string } | null = null;

vi.mock("@/lib/supabase", () => {
  const constructor = (tabla: string) => ({
    insert: async (fila: { id: string; tipo: string }) => {
      if (tabla !== "stripe_eventos") return { error: null };
      if (registros.some((r) => r.id === fila.id)) return { error: { code: "23505", message: "dup" } };
      registros.push(fila);
      return { error: null };
    },
    delete: () => ({
      eq: async (_c: string, id: string) => {
        const i = registros.findIndex((r) => r.id === id);
        if (i >= 0) registros.splice(i, 1);
        return { error: null };
      },
    }),
    update: (valores: Record<string, unknown>) => {
      const cadena = {
        eq: () => cadena,
        neq: () => cadena,
        then: (resolve: (v: { error: { message: string } | null }) => void) => {
          if (!errorEnUpdate) actualizaciones.push(valores);
          resolve({ error: errorEnUpdate });
        },
      };
      return cadena;
    },
  });
  return { supabaseAdmin: { from: constructor } };
});

let eventoActual: Record<string, unknown>;
let suscripcionActual: Record<string, unknown>;

vi.mock("@/lib/stripe/client", () => ({
  getStripe: () => ({
    webhooks: { constructEvent: () => eventoActual },
    subscriptions: { retrieve: async () => suscripcionActual },
  }),
}));

import { POST } from "./route";

const peticion = () =>
  new Request("https://x.test/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": "firma" },
    body: "{}",
  });

function sub(status: string) {
  return {
    id: "sub_1",
    status,
    customer: "cus_1",
    metadata: { clerk_org_id: "org_1" },
    items: { data: [{ price: { id: "price_pro" }, current_period_end: 1_800_000_000 }] },
  };
}

beforeEach(() => {
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  registros.length = 0;
  actualizaciones.length = 0;
  errorEnUpdate = null;
  vi.spyOn(console, "error").mockImplementation(() => {});
  eventoActual = {
    id: "evt_1",
    type: "customer.subscription.updated",
    data: { object: sub("active") },
  };
});

describe("webhook de Stripe", () => {
  it("activa Pro cuando la suscripción está activa", async () => {
    suscripcionActual = sub("active");
    const res = await POST(peticion());
    expect(res.status).toBe(200);
    expect(actualizaciones[0]).toMatchObject({ suscripcion_activa: true, plan: "pro", stripe_customer_id: "cus_1" });
  });

  it("conserva el acceso en past_due (Stripe sigue reintentando el cobro)", async () => {
    suscripcionActual = sub("past_due");
    await POST(peticion());
    expect(actualizaciones[0]).toMatchObject({ suscripcion_activa: true });
  });

  it("degrada a Free cuando la suscripción está cancelada", async () => {
    suscripcionActual = sub("canceled");
    await POST(peticion());
    expect(actualizaciones.some((a) => a.suscripcion_activa === false)).toBe(true);
    expect(actualizaciones.some((a) => a.plan === "free")).toBe(true);
  });

  it("es idempotente: un evento repetido no vuelve a escribir", async () => {
    suscripcionActual = sub("active");
    await POST(peticion());
    const antes = actualizaciones.length;
    const res = await POST(peticion());
    expect(res.status).toBe(200);
    expect(actualizaciones.length).toBe(antes);
  });

  it("devuelve 500 (para que Stripe reintente) si falla la escritura, y libera el evento", async () => {
    suscripcionActual = sub("active");
    errorEnUpdate = { message: "db caída" };
    const res = await POST(peticion());
    expect(res.status).toBe(500);
    expect(registros).toHaveLength(0);
  });

  it("rechaza peticiones sin firma", async () => {
    const res = await POST(new Request("https://x.test", { method: "POST", body: "{}" }));
    expect(res.status).toBe(400);
  });
});
