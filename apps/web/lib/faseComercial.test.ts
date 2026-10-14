import { describe, expect, it } from "vitest";

import {
  agruparPorFase,
  esFaseComercial,
  FASES_COMERCIALES_ORDEN,
  type FaseComercial,
} from "./faseComercial";

describe("esFaseComercial", () => {
  it("acepta cada valor de FASES_COMERCIALES_ORDEN", () => {
    for (const fase of FASES_COMERCIALES_ORDEN) {
      expect(esFaseComercial(fase)).toBe(true);
    }
  });

  it("rechaza un valor arbitrario", () => {
    expect(esFaseComercial("no_existe")).toBe(false);
  });
});

describe("agruparPorFase", () => {
  it("devuelve una entrada por cada fase, aunque esté vacía", () => {
    const grupos = agruparPorFase<{ fase_comercial: FaseComercial }>([]);
    for (const fase of FASES_COMERCIALES_ORDEN) {
      expect(grupos[fase]).toEqual([]);
    }
  });

  it("agrupa cada item en la columna de su fase", () => {
    const items = [
      { id: "a", fase_comercial: "clasificado" as FaseComercial },
      { id: "b", fase_comercial: "aprobado" as FaseComercial },
      { id: "c", fase_comercial: "clasificado" as FaseComercial },
    ];
    const grupos = agruparPorFase(items);
    expect(grupos.clasificado.map((i) => i.id)).toEqual(["a", "c"]);
    expect(grupos.aprobado.map((i) => i.id)).toEqual(["b"]);
    expect(grupos.prospeccion).toEqual([]);
  });
});
