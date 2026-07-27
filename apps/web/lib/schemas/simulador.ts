import { z } from "zod";

export const facturaResponseSchema = z.discriminatedUnion("estado", [
  z.object({
    estado: z.literal("exitoso"),
    id: z.string().min(1),
  }),
  z.object({
    estado: z.literal("error"),
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
    "verificada",
    "generica_pendiente_url",
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
