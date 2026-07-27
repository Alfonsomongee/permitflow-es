import { describe, expect, it } from "vitest";
import { parsePositiveNumber } from "./numbers";

describe("parsePositiveNumber", () => {
  it("devuelve undefined para cadenas vacías o solo con espacios", () => {
    expect(parsePositiveNumber("")).toBeUndefined();
    expect(parsePositiveNumber("   ")).toBeUndefined();
  });

  it("devuelve undefined para 0", () => {
    expect(parsePositiveNumber("0")).toBeUndefined();
  });

  it("devuelve undefined para números negativos", () => {
    expect(parsePositiveNumber("-1")).toBeUndefined();
    expect(parsePositiveNumber("-3.5")).toBeUndefined();
  });

  it("devuelve el número para valores numéricos válidos", () => {
    expect(parsePositiveNumber("3.5")).toBe(3.5);
    expect(parsePositiveNumber("100")).toBe(100);
    expect(parsePositiveNumber("0.1")).toBe(0.1);
  });

  it("devuelve undefined para valores alfanuméricos o mal formados", () => {
    expect(parsePositiveNumber("3abc")).toBeUndefined();
    expect(parsePositiveNumber("abc")).toBeUndefined();
  });

  it("devuelve undefined para Infinity o NaN explícito", () => {
    expect(parsePositiveNumber("Infinity")).toBeUndefined();
    expect(parsePositiveNumber("-Infinity")).toBeUndefined();
    expect(parsePositiveNumber("NaN")).toBeUndefined();
  });
});
