import { z } from "zod";

export const facturaResponseSchema = z.discriminatedUnion("estado", [
  z.object({
    estado: z.literal("exitoso"),
    id: z.string().min(1),
    consumo_anual_kwh: z.number().finite().nonnegative().nullable().optional(),
    fuente_dato: z.enum(["leido", "estimado"]).nullable().optional(),
    // Solo presente en la respuesta de /simulador/factura/csv (import de Datadis)
    consumo_mensual_disponible: z.boolean().optional(),
  }),
  z.object({
    // El backend (facturas_parser.py / datadis_parser.py) emite "no_extraido",
    // nunca "error" -- el literal anterior no coincidía nunca y cualquier
    // fallo de extracción se convertía en un ApiContractError genérico en
    // vez del mensaje real (bug encontrado al añadir el import de Datadis).
    estado: z.literal("no_extraido"),
    error: z.string().min(1).optional(),
  }),
]);

export const generarResponseSchema = z.object({
  estudio_id: z.string().min(1),
  token: z.string().min(1),
});

const incentivoFiscalSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string(),
  ahorro_estimado: z.number().finite().nonnegative(),
  nivel_verificacion: z.enum([
    "verified",
    "pending_verification",
  ]),
});

const escenarioSchema = z.object({
  nombre: z.string().min(1),
  potencia_kwp: z.number().finite().positive(),
  coste_inicial: z.number().finite().positive(),
  ahorro_anual: z.number().finite().positive(),
  ahorro_5_anios: z.number().finite().nonnegative(),
  ahorro_10_anios: z.number().finite().nonnegative(),
});

const supuestoSchema = z.object({
  parametro: z.string().min(1),
  valor_asumido: z.string(),
  razon: z.string(),
  // El backend lo emite en apps/api/servicios/calculo_financiero.py (D-02 auditoría):
  // sin declararlo aquí, Zod lo descartaba silenciosamente al parsear la respuesta
  // y el frontend no podía distinguir un dato leído de la factura de uno estimado.
  fuente_dato: z.enum(["leido", "estimado"]).optional(),
});

const informeSimulacionSchema = z.object({
  recomendacion_final: z.string(),
  escenarios: z.array(escenarioSchema),
  incentivos_fiscales: z.array(incentivoFiscalSchema),
  supuestos_utilizados: z.array(supuestoSchema),
});

export const estudioResponseSchema = z.discriminatedUnion("estado", [
  z.object({
    estado: z.literal("pendiente"),
  }),
  z.object({
    estado: z.literal("completado"),
    resultado: informeSimulacionSchema,
  }),
  z.object({
    estado: z.literal("error"),
    error: z.string().optional(),
  }),
]);

export type FacturaResponse = z.infer<typeof facturaResponseSchema>;
export type GenerarResponse = z.infer<typeof generarResponseSchema>;
export type EstudioResponse = z.infer<typeof estudioResponseSchema>;
export type InformeSimulacionIA = z.infer<typeof informeSimulacionSchema>;
