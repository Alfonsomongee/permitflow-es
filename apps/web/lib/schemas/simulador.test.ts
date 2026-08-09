import { describe, expect, it } from "vitest";
import {
  estudioResponseSchema,
  facturaResponseSchema,
  generarResponseSchema,
} from "./simulador";

describe("facturaResponseSchema", () => {
  it("acepta estado exitoso con id", () => {
    const valid = { estado: "exitoso", id: "1234" };
    expect(() => facturaResponseSchema.parse(valid)).not.toThrow();
  });

  it("acepta estado no_extraido con y sin mensaje", () => {
    // El backend (facturas_parser.py / datadis_parser.py) emite "no_extraido",
    // no "error" -- contrato corregido al añadir el import de Datadis.
    expect(() => facturaResponseSchema.parse({ estado: "no_extraido", error: "algo falló" })).not.toThrow();
    expect(() => facturaResponseSchema.parse({ estado: "no_extraido" })).not.toThrow();
  });

  it("rechaza estados desconocidos", () => {
    expect(() => facturaResponseSchema.parse({ estado: "completado", id: "123" })).toThrow();
  });
});

describe("generarResponseSchema", () => {
  it("acepta respuestas válidas", () => {
    expect(() => generarResponseSchema.parse({ estudio_id: "id", token: "tok" })).not.toThrow();
  });

  it("rechaza sin token o estudio_id vacío", () => {
    expect(() => generarResponseSchema.parse({ estudio_id: "id" })).toThrow();
    expect(() => generarResponseSchema.parse({ estudio_id: "id", token: "" })).toThrow(); // min(1)
  });
});

describe("estudioResponseSchema", () => {
  const resultadoFalso = {
    recomendacion_final: "Ok",
    escenarios: [
      {
        nombre: "Base",
        potencia_kwp: 3,
        coste_inicial: 5000,
        ahorro_anual: 1000,
        ahorro_5_anios: 5000,
        ahorro_10_anios: 10000,
      }
    ],
    incentivos_fiscales: [
      {
        nombre: "IBI",
        descripcion: "50%",
        ahorro_estimado: 200,
        nivel_verificacion: "verified",
      }
    ],
    supuestos_utilizados: [
      {
        parametro: "A",
        valor_asumido: "B",
        razon: "C",
      }
    ]
  };

  it("acepta pendiente", () => {
    expect(() => estudioResponseSchema.parse({ estado: "pendiente" })).not.toThrow();
  });

  it("acepta completado con resultado válido", () => {
    expect(() => estudioResponseSchema.parse({ estado: "completado", resultado: resultadoFalso })).not.toThrow();
  });

  it("rechaza números como cadenas en el resultado", () => {
    const resultadoMalo = {
      ...resultadoFalso,
      escenarios: [
        { ...resultadoFalso.escenarios[0], ahorro_anual: "1000" }
      ]
    };
    expect(() => estudioResponseSchema.parse({ estado: "completado", resultado: resultadoMalo })).toThrow();
  });

  it("rechaza NaN o Infinity en valores económicos", () => {
    const resultadoNaN = {
      ...resultadoFalso,
      escenarios: [
        { ...resultadoFalso.escenarios[0], ahorro_anual: NaN }
      ]
    };
    expect(() => estudioResponseSchema.parse({ estado: "completado", resultado: resultadoNaN })).toThrow();
  });

  it("rechaza incentivos con ahorro negativo", () => {
    const resultadoIncentivoMalo = {
      ...resultadoFalso,
      incentivos_fiscales: [
        { ...resultadoFalso.incentivos_fiscales[0], ahorro_estimado: -10 }
      ]
    };
    expect(() => estudioResponseSchema.parse({ estado: "completado", resultado: resultadoIncentivoMalo })).toThrow();
  });
});
