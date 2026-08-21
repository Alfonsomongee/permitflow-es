import { z } from "zod";

// Estos campos numericos (guardados como string por el formulario, como
// potencia_kw) no tenian ninguna validacion de signo: un "-50" en
// superficie_m2 o potencia_resultante_kw pasaba tal cual hasta el backend, que
// SI lo rechaza (schemas/clasificador.py), pero como un 422 generico tras
// enviar el formulario en vez de un error inline antes de enviarlo. La
// presencia obligatoria de cada campo (cuando aplica) ya la exige superRefine
// mas abajo; esto solo cierra la puerta a valores negativos, cero o no
// numericos cuando el campo SI tiene contenido. De los ocho campos que
// listaba el plan de accion, siete son realmente numericos (superficie_m2,
// numero_puntos, potencia_por_punto_kw, inversion_eur, potencia_resultante_kw,
// presion_resultante_bar, incremento_potencia_pct); presion_bar no lo es --
// ver su comentario propio mas abajo (plan de accion consolidado 2026-08-12,
// P-18).
function esNumeroPositivoOVacio(val: string | undefined): boolean {
  if (!val) return true;
  const num = parseFloat(val);
  return Number.isFinite(num) && num > 0;
}

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
  
  superficie_m2: z.string().refine(esNumeroPositivoOVacio, {
    message: "La superficie debe ser un numero mayor que 0 (o dejarla vacia).",
  }),

  // IRVE
  numero_puntos: z.string().refine(esNumeroPositivoOVacio, {
    message: "El numero de puntos de recarga debe ser mayor que 0.",
  }),
  potencia_por_punto_kw: z.string().refine(esNumeroPositivoOVacio, {
    message: "La potencia por punto debe ser mayor que 0 kW.",
  }),
  modo_recarga: z.string(),
  acceso_publico: z.boolean(),
  ubicacion_irve: z.string(),
  requiere_nuevo_suministro: z.boolean(),

  // Gas
  combustible: z.string(),
  // presion_bar NO es un campo numerico: es un selector con dos valores fijos
  // ("normal" | "5+", ver Step2ParametrosTecnicos.tsx CamposGas), así que no
  // lleva el refine de positividad de los demas campos numericos de esta
  // lista -- "normal" fallaria esa comprobacion sin ser un dato invalido.
  // (Verificado antes de aplicar el refine "de oidas" del plan de accion,
  // 2026-08-12, P-18: la lista original del plan lo incluía por asunción,
  // no por inspección del formulario real.)
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
  inversion_eur: z.string().optional().refine(esNumeroPositivoOVacio, {
    message: "La inversion debe ser un numero mayor que 0 (o dejarla vacia).",
  }),

  // Gas ampliado (Madrid / Cataluna lo exigen siempre para gas_baja_presion)
  potencia_resultante_kw: z.string().optional().refine(esNumeroPositivoOVacio, {
    message: "La potencia resultante debe ser mayor que 0 kW.",
  }),
  presion_resultante_bar: z.string().optional().refine(esNumeroPositivoOVacio, {
    message: "La presion resultante debe ser mayor que 0 bar.",
  }),
  es_ampliacion: z.boolean().optional(),
  incremento_potencia_pct: z.string().optional().refine(esNumeroPositivoOVacio, {
    message: "El incremento de potencia debe ser mayor que 0%.",
  }),

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
  // El RITE (art. 15.1.c) exime de documentacion y registro al ACS producida
  // con calentadores, termos electricos hasta 70 kW o solar prefabricado.
  tipo_generador_acs: z.string().optional(),

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
    // Espejo de schemas/clasificador.py::validate_inputs_by_ca (auditoria
    // motor normativo 2026-08-19): sin estos dos datos, json-logic evalua las
    // condiciones que dependen de ellos como falsy y el plan sale incompleto
    // sin aviso. A diferencia de tipo_generador_acs, no hay ningun caso
    // documentado en el que omitirlos sea legitimamente retrocompatible.
    if (!data.modo_recarga) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona el modo de recarga.",
        path: ["modo_recarga"],
      });
    }
    if (!data.ubicacion_irve) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Indica la ubicacion de la instalacion de recarga.",
        path: ["ubicacion_irve"],
      });
    }
  }

  // Campos de Legionela / riesgo sanitario en ACS, por CCAA (cierre de
  // Prioridad 1, 2026-08-20). Espejo exacto de schemas/clasificador.py: a
  // diferencia de tipo_generador_acs, omitirlos hace que el trámite de
  // Legionela se salte en silencio -- dirección de riesgo opuesta, así que
  // se bloquean en vez de solo avisar.
  if (data.tipo_instalacion === "acs") {
    if (
      ["aragon", "baleares", "castilla_leon", "pais_vasco", "andalucia"].includes(data.comunidad) &&
      data.uso_colectivo === undefined
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Indica si la instalacion de ACS es de uso colectivo.", path: ["uso_colectivo"] });
    }
    if (
      data.comunidad === "andalucia" &&
      data.uso_colectivo === true &&
      (data.acumulacion === undefined || data.recirculacion === undefined)
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Indica si dispone de acumulacion y de recirculacion.", path: ["acumulacion"] });
    }
    if (data.comunidad === "asturias" && data.acs_centralizada === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Indica si la instalacion de ACS es de uso centralizado.", path: ["acs_centralizada"] });
    }
    if (
      ["canarias", "madrid"].includes(data.comunidad) &&
      data.incluida_ambito_rd_487_2022 === undefined
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Indica si la instalacion esta incluida en el ambito del RD 487/2022 (Legionela).", path: ["incluida_ambito_rd_487_2022"] });
    }
  }

  if (data.comunidad === "canarias" && data.tipo_instalacion === "fotovoltaica_autoconsumo" && !data.implantacion) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Indica la implantacion de la instalacion (cubierta o suelo).", path: ["implantacion"] });
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
      if (data.uso_edificio === "residencial" && !data.numero_suministros_edificio) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Indica el numero de suministros del edificio.", path: ["numero_suministros_edificio"] });
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
