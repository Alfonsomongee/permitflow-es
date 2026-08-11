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
  nivel_tension_consumidor: z.string().optional(),
  nivel_tension_generacion: z.string().optional(),
  nivel_tension_conexion: z.string().optional(),
  // Valores reales del backend: "sin_excedentes" | "con_excedentes_sin_compensacion" | "con_excedentes_con_compensacion"
  modalidad_autoconsumo: z.string(),
  ubicacion_suelo: z.string().optional(),
  requiere_acceso_conexion: z.boolean().optional(),
  inversion_eur: z.string().optional(),

  // Gas ampliado (Madrid / Cataluna lo exigen siempre para gas_baja_presion)
  potencia_resultante_kw: z.string().optional(),
  presion_resultante_bar: z.string().optional(),
  es_ampliacion: z.boolean().optional(),
  incremento_potencia_pct: z.string().optional(),

  // IRVE garaje comunitario (Cataluna)
  uso_edificio: z.string().optional(),
  ventilacion_garaje: z.string().optional(),
  numero_plazas_garaje: z.string().optional(),
  garaje_existente: z.boolean().optional(),

  // ACS (Cataluna exige legionela si centralizada o >=70kW)
  acs_centralizada: z.boolean().optional(),
  incluida_ambito_legionella: z.boolean().optional(),
  dispone_acumulacion: z.boolean().optional(),
  dispone_circuito_retorno: z.boolean().optional(),

  // Campos que las reglas del motor sí usan pero que el formulario no recogia:
  // sin ellos json-logic los evalua como falsy y la rama negativa gana en
  // silencio, dejando fuera tramites de legionela, registro de produccion,
  // calificacion territorial e inspeccion inicial (auditoria QA 2026-08-11, C-01).
  uso_colectivo: z.boolean().optional(),
  acumulacion: z.boolean().optional(),
  recirculacion: z.boolean().optional(),
  incluida_ambito_rd_487_2022: z.boolean().optional(),
  instalacion_origen_modificada: z.boolean().optional(),
  implantacion: z.string().optional(),
  clase_instalacion_gas: z.string().optional(),
  requiere_registro_produccion: z.boolean().optional(),
  numero_suministros_edificio: z.string().optional(),

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

  // Espejo de las validaciones del backend (schemas/clasificador.py::validate_inputs_by_ca)
  // para que el usuario vea el error ANTES de enviar, no como un 422 generico.
  const esGasConDatosResultantes =
    data.tipo_instalacion === "gas_baja_presion" &&
    (data.comunidad === "madrid" || data.comunidad === "cataluna");
  if (esGasConDatosResultantes) {
    if (!data.potencia_resultante_kw) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Indica la potencia resultante de la instalacion de gas.",
        path: ["potencia_resultante_kw"],
      });
    }
    if (!data.presion_resultante_bar) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Indica la presion resultante de la instalacion de gas.",
        path: ["presion_resultante_bar"],
      });
    }
    if (data.es_ampliacion && !data.incremento_potencia_pct) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Indica el porcentaje de incremento de potencia de la ampliacion.",
        path: ["incremento_potencia_pct"],
      });
    }
  }

  if (data.comunidad === "cataluna") {
    if (
      data.tipo_instalacion === "irve" &&
      data.ubicacion_irve === "garaje_comunitario"
    ) {
      if (!data.uso_edificio) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Indica el uso del edificio.", path: ["uso_edificio"] });
      }
      if (!data.ventilacion_garaje) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Indica el tipo de ventilacion del garaje.", path: ["ventilacion_garaje"] });
      }
      if (!data.numero_plazas_garaje) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Indica el numero de plazas del garaje.", path: ["numero_plazas_garaje"] });
      }
      if (data.garaje_existente === undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Indica si el garaje es existente.", path: ["garaje_existente"] });
      }
    }

    if (data.tipo_instalacion === "fotovoltaica_autoconsumo") {
      if (!data.modalidad_autoconsumo) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Selecciona la modalidad de autoconsumo.", path: ["modalidad_autoconsumo"] });
      }
      if (!data.ubicacion_suelo) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Indica la clasificacion del suelo.", path: ["ubicacion_suelo"] });
      }
      if (data.requiere_acceso_conexion === undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Indica si requiere acceso y conexion a red.", path: ["requiere_acceso_conexion"] });
      }
    }

    if (data.tipo_instalacion === "acs") {
      const potencia = parseFloat(data.potencia_kw || "0");
      const legionellaMaterial = data.acs_centralizada === true || potencia >= 70;
      if (legionellaMaterial && data.incluida_ambito_legionella === undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Indica si aplica el ambito de prevencion de Legionela.", path: ["incluida_ambito_legionella"] });
      }
      if (
        data.acs_centralizada === true &&
        potencia > 70 &&
        data.dispone_acumulacion === undefined &&
        data.dispone_circuito_retorno === undefined
      ) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Indica si dispone de acumulacion y/o circuito de retorno.", path: ["dispone_acumulacion"] });
      }
    }
  }
});

export type NuevaInstalacionFormData = z.infer<typeof nuevaInstalacionSchema>;
