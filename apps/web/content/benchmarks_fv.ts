export const BENCHMARKS_FV = {
  m2_por_kwp: {
    min: 5,
    max: 7,
    fuente: null,
    fecha: null,
    verificada: false,
    nota: "Ratio de dimensionamiento estándar del sector (paneles actuales ~550W ≈ 4,7-5 m2/kWp).",
  },
  coste_eur_por_kwp: {
    residencial: {
      min: 900,
      max: 1188, // Anexo III RD 477/2021: 1.188 €/kWp para P <= 10 kWp
      fuente_max:
        "RD 477/2021, Anexo III, costes unitarios máximos subvencionables (BOE-A-2021-10824) como techo de referencia oficial",
      fuente_min: null,
      fecha: "2026-07",
      verificada: false,
      nota: "Techo anclado a referencia oficial de 2021 (1.188 €/kWp para P<=10kWp); el suelo es estimación de mercado. Mostrar siempre como horquilla orientativa.",
    },
    industrial_cubierta: {
      min: 600,
      max: 910, // Anexo III RD 477/2021: 910 €/kWp para 10 < P <= 100 kWp (aprox. para industrial pequeño)
      fuente_max: "RD 477/2021, Anexo III (BOE-A-2021-10824)",
      fuente_min: null,
      fecha: "2026-07",
      verificada: false,
    },
  },
  ratio_autoconsumo_sin_bateria: {
    min: 0.2,
    max: 0.4,
    fuente: null,
    fecha: null,
    verificada: false,
  },
  precio_kwh_defecto: {
    valor: 0.261,
    fuente:
      "Eurostat, nrg_pc_204 (doméstico España, banda DC 2.500-5.000 kWh, impuestos incluidos), S1 2025",
    url: "https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Electricity_price_statistics",
    fecha: "2025-S1",
    verificada: true,
    nota: "El precio incluye impuestos y término de energía. NO incluye término fijo de potencia. S2-2025 apunta a ~0,2975 EUR/kWh según fuentes secundarias; actualizar cuando se confirme en el dataset.",
  },
} as const;
