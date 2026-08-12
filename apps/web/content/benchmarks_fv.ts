// GENERADO desde apps/api/servicios/constantes_mercado_fv.json — no editar a mano.
// Regenerar con: python3 scripts/generar_benchmarks_fv.py
// Fuente única de las constantes de mercado (no normativas) de fotovoltaica
// residencial, compartida con apps/api/servicios/calculo_financiero.py -- evita que
// el simulador de "Orientación" (frontend) y el Simulador AI (backend) diverjan
// en silencio sobre el mismo dato (plan de acción consolidado 2026-08-12, P-17).

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
      max: 1400,
      fuente: null,
      fecha: "2026-07",
      verificada: false,
      referencia_oficial: "RD 477/2021 Anexo III, Programa 4: \"Coste subvencionable unitario máximo: 1.188 €/kWp\" para instalaciones P ≤ 10 kWp (tope administrativo 2021, no precio de mercado)",
    },
    industrial_cubierta: {
      min: 600,
      max: 1000,
      fuente: null,
      fecha: "2026-07",
      verificada: false,
      referencia_oficial: "RD 477/2021 Anexo III, Programa 2: \"Coste subvencionable unitario máximo: 910 €/kWp\" para instalaciones 10 kWp < P ≤ 100 kWp (tope administrativo 2021, no precio de mercado)",
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
    fuente: "Eurostat, nrg_pc_204 (doméstico España, banda DC 2.500-5.000 kWh, impuestos incluidos), S1 2025",
    url: "https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Electricity_price_statistics",
    fecha: "2025-S1",
    verificada: true,
    nota: "El precio incluye impuestos y término de energía. NO incluye término fijo de potencia. S2-2025 apunta a ~0,2975 EUR/kWh según fuentes secundarias; actualizar cuando se confirme en el dataset.",
  },
} as const;
