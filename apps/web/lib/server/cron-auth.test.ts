import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verificarCron } from "./cron-auth";

function req(authorization?: string): Request {
  return new Request("https://x.test/api/cron/x", {
    headers: authorization ? { authorization } : {},
  });
}

describe("verificarCron", () => {
  const original = process.env.CRON_SECRET;
  beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
  afterEach(() => {
    vi.restoreAllMocks();
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  it("falla cerrado si CRON_SECRET no existe, incluso con 'Bearer undefined'", () => {
    delete process.env.CRON_SECRET;
    expect(verificarCron(req("Bearer undefined"))?.status).toBe(503);
    expect(verificarCron(req())?.status).toBe(503);
  });

  it("rechaza cabecera ausente o incorrecta", () => {
    process.env.CRON_SECRET = "s3creto";
    expect(verificarCron(req())?.status).toBe(401);
    expect(verificarCron(req("Bearer otro"))?.status).toBe(401);
    expect(verificarCron(req("s3creto"))?.status).toBe(401);
  });

  it("acepta el secreto correcto", () => {
    process.env.CRON_SECRET = "s3creto";
    expect(verificarCron(req("Bearer s3creto"))).toBeNull();
  });
});
