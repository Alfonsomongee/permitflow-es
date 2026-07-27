import { z } from "zod";

export const nuevaInstalacionSchema = z.object({
  // Step 1
  tipo_instalacion: z.string().min(1, "Selecciona el tipo de instalacion."),
  comunidad: z.string().min(1, "Selecciona una comunidad autonoma."),
  referencia_cliente: z.string(),
  uso: z.string().min(1, "Selecciona el uso."),

  // Step 2
  potencia_kw: z.string().refine((val) => {
    if (!val) return false;
    const num = parseFloat(val);
    return !Number.isNaN(num) && num > 0;
  }, { message: "Introduce una potencia valida mayor que 0 kW." }),
  
  superficie_m2: z.string(),

  // IRVE
  numero_puntos: z.string(),
  potencia_por_punto_kw: z.string(),
  modo_recarga: z.string(),
  acceso_publico: z.boolean(),
  ubicacion_irve: z.string(),
  requiere_nuevo_suministro: z.boolean(),

  // Gas
  combustible: z.string(),
  presion_bar: z.string(),

  // PV
  tension: z.string(),
  modalidad_autoconsumo: z.string(),

  // Step 3
  solicita_ayuda: z.boolean(),
}).superRefine((data, ctx) => {
  // Validaciones condicionales
  if (data.tipo_instalacion === "irve") {
    const puntos = parseInt(data.numero_puntos || "0", 10);
    if (Number.isNaN(puntos) || puntos < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El numero de puntos de recarga debe ser al menos 1.",
        path: ["numero_puntos"],
      });
    }
  }
});

export type NuevaInstalacionFormData = z.infer<typeof nuevaInstalacionSchema>;
