"use client";

import { useFormContext, Controller } from "react-hook-form";
import { type FormState } from "./types";
import { campoAplica } from "@/content/campos_condicionales";
import {
  Field,
  NumberInput,
  ToggleGroup,
  BoolToggle,
  SectionDivider,
  InfoBanner,
} from "./FormPrimitives";

// ─── Campos que solo aplican en algunas comunidades ──────────────────────────

/**
 * Campos que las reglas de ciertas comunidades usan para ramificar y que el
 * formulario no recogía (auditoría QA 2026-08-11, C-01). Al no enviarse,
 * json-logic los evaluaba como falsy y desaparecían del plan trámites reales:
 * plan de legionela, calificación territorial, registro de producción e
 * inspección inicial por organismo de control.
 *
 * Qué campo se muestra en qué comunidad NO se decide aquí: se consulta
 * `campoAplica()` sobre el mapa generado desde las propias condiciones del
 * motor (content/campos_condicionales.ts). Mantener esa correspondencia a mano
 * es precisamente lo que causó C-01.
 */
interface DefinicionCampo {
  tipo: "bool" | "entero" | "opciones";
  label: string;
  hint?: string;
  opciones?: { value: string; label: string }[];
  cols?: 2 | 3 | 4;
}

const CAMPOS_NORMATIVOS: Record<string, DefinicionCampo> = {
  uso_colectivo: {
    tipo: "bool",
    label: "¿Es una instalación de uso colectivo?",
    hint: "Da servicio a varias viviendas, locales o usuarios (no a una única vivienda). Activa las obligaciones de prevención de legionelosis.",
  },
  acumulacion: {
    tipo: "bool",
    label: "¿Tiene depósito de acumulación?",
    hint: "Los depósitos de acumulación son puntos críticos en el control de legionela.",
  },
  recirculacion: {
    tipo: "bool",
    label: "¿Tiene circuito de recirculación?",
    hint: "El retorno de agua caliente influye en el régimen de control sanitario aplicable.",
  },
  incluida_ambito_rd_487_2022: {
    tipo: "bool",
    label: "¿Está incluida en el ámbito del RD 487/2022 (legionela)?",
    hint: "El RD 487/2022 fija los requisitos sanitarios para instalaciones de riesgo frente a legionela. Ante la duda, consúltalo con el técnico redactor.",
  },
  instalacion_origen_modificada: {
    tipo: "bool",
    label: "¿Se modifica la instalación eléctrica existente?",
    hint: "Si la instalación de origen se reforma o amplía, el trámite de puesta en servicio es distinto al de una instalación nueva.",
  },
  implantacion: {
    tipo: "opciones",
    label: "Tipo de implantación",
    hint: "La implantación en suelo puede exigir Calificación Territorial ante el Cabildo insular.",
    cols: 3,
    opciones: [
      { value: "cubierta", label: "Cubierta" },
      { value: "suelo", label: "Suelo" },
      { value: "marquesina", label: "Marquesina" },
      { value: "fachada", label: "Fachada" },
    ],
  },
  clase_instalacion_gas: {
    tipo: "opciones",
    label: "Clase de instalación de gas",
    hint: "Determina si hace falta proyecto técnico o basta con declaración responsable.",
    cols: 3,
    opciones: [
      { value: "individual", label: "Individual" },
      { value: "comun", label: "Común del edificio" },
      { value: "conexion_servicio", label: "Conexión de servicio" },
    ],
  },
  requiere_registro_produccion: {
    tipo: "bool",
    label: "¿Requiere inscripción en el Registro de Producción de Energía Eléctrica?",
    hint: "Aplica a instalaciones que vierten energía a la red bajo el RD 413/2014. En autoconsumo sin excedentes no aplica.",
  },
  numero_suministros_edificio: {
    tipo: "entero",
    label: "Número de suministros eléctricos del edificio",
    hint: "En edificios residenciales con 20 o más suministros puede exigirse inspección inicial por organismo de control.",
  },
};

/**
 * Renderiza los campos de `campos` que apliquen a la comunidad y tecnología
 * seleccionadas. Si ninguno aplica, no pinta ni el separador.
 */
function CamposSegunNormativa({ campos }: { campos: string[] }) {
  const { control, watch } = useFormContext<FormState>();
  const comunidad = watch("comunidad");
  const tipoInstalacion = watch("tipo_instalacion");

  const aplicables = campos.filter((campo) =>
    campoAplica(comunidad, tipoInstalacion, campo)
  );
  if (aplicables.length === 0) return null;

  return (
    <>
      <SectionDivider label="Datos exigidos por la normativa de esta comunidad" />
      {aplicables.map((campo) => {
        const def = CAMPOS_NORMATIVOS[campo];
        if (!def) return null;
        return (
          <Controller
            key={campo}
            control={control}
            name={campo as keyof FormState}
            render={({ field, fieldState }) => (
              <Field label={def.label} hint={def.hint} error={fieldState.error?.message}>
                {def.tipo === "bool" ? (
                  <BoolToggle
                    value={(field.value as boolean | undefined) ?? false}
                    onChange={field.onChange}
                  />
                ) : def.tipo === "entero" ? (
                  <NumberInput
                    value={(field.value as string | undefined) ?? ""}
                    onChange={field.onChange}
                    placeholder="ej. 24"
                    min={0}
                    step={1}
                  />
                ) : (
                  <ToggleGroup
                    value={(field.value as string | undefined) ?? ""}
                    onChange={field.onChange}
                    options={def.opciones ?? []}
                    cols={def.cols ?? 2}
                  />
                )}
              </Field>
            )}
          />
        );
      })}
    </>
  );
}

// ─── Sub-formularios por vertical ────────────────────────────────────────────

function CamposPotenciaBase({ label, hint }: { label?: string; hint?: string }) {
  const { control } = useFormContext<FormState>();
  return (
    <Controller
      control={control}
      name="potencia_kw"
      render={({ field, fieldState }) => (
        <Field label={label || "Potencia total de la instalación (kW)"} hint={hint} error={fieldState.error?.message}>
          <NumberInput
            value={field.value ?? ""}
            onChange={field.onChange}
            placeholder="ej. 9.9"
            min={0}
            suffix="kW"
          />
        </Field>
      )}
    />
  );
}

function CamposDatosElectricos() {
  const { control } = useFormContext<FormState>();
  return (
    <>
      <SectionDivider label="Datos Eléctricos" />
      <Controller
        control={control}
        name="tension"
        render={({ field, fieldState }) => (
          <Field label="Nivel de tensión de conexión" error={fieldState.error?.message}>
            <ToggleGroup
              value={field.value as "BT" | "AT"}
              onChange={field.onChange}
              options={[
                { value: "BT", label: "Baja Tensión (BT)" },
                { value: "AT", label: "Alta Tensión (AT)" },
              ]}
              cols={2}
            />
          </Field>
        )}
      />
    </>
  );
}

function CamposFotovoltaica() {
  const { control, watch } = useFormContext<FormState>();
  const potencia = parseFloat(watch("potencia_kw"));
  const comunidad = watch("comunidad");
  const esCataluna = comunidad === "cataluna";

  return (
    <>
      <CamposPotenciaBase
        hint="Para fotovoltaica (RD 244/2019), introduce la potencia máxima del inversor (potencia nominal), NO la potencia pico de los paneles."
      />

      <Controller
        control={control}
        name="superficie_m2"
        render={({ field, fieldState }) => (
          <Field label="Superficie ocupada por los módulos (m²)" hint="Opcional. Si la indicas, el plan avisa cuando no cuadra con la potencia declarada (un dedazo habitual es dar la potencia pico en vez de la nominal)." error={fieldState.error?.message}>
            <NumberInput
              value={field.value ?? ""}
              onChange={field.onChange}
              placeholder="ej. 50"
              min={0}
              suffix="m²"
            />
          </Field>
        )}
      />

      {potencia > 100 && (
        <InfoBanner>
          Instalaciones superiores a 100 kW pueden requerir autorización administrativa
          previa en vez de PUES, según la comunidad autónoma.
        </InfoBanner>
      )}

      <Controller
        control={control}
        name="inversion_eur"
        render={({ field, fieldState }) => (
          <Field
            label="Inversión estimada de la instalación (€)"
            hint="Algunas comunidades (Cataluña, Madrid, País Vasco, C. Valenciana) aplican tramos de tramitación distintos según el importe de la inversión."
            error={fieldState.error?.message}
          >
            <NumberInput
              value={field.value ?? ""}
              onChange={field.onChange}
              placeholder="ej. 8000"
              min={0}
              suffix="€"
            />
          </Field>
        )}
      />

      <CamposDatosElectricos />

      <Controller
        control={control}
        name="modalidad_autoconsumo"
        render={({ field, fieldState }) => (
          <Field label="Modalidad de Autoconsumo" error={fieldState.error?.message}>
            <ToggleGroup
              value={field.value as "sin_excedentes" | "con_excedentes_sin_compensacion" | "con_excedentes_con_compensacion"}
              onChange={field.onChange}
              options={[
                { value: "sin_excedentes", label: "Sin excedentes" },
                { value: "con_excedentes_sin_compensacion", label: "Con excedentes, sin compensación" },
                { value: "con_excedentes_con_compensacion", label: "Con excedentes, con compensación" },
              ]}
              cols={3}
            />
          </Field>
        )}
      />

      {esCataluna && (
        <>
          <SectionDivider label="Datos específicos de Cataluña" />
          <Controller
            control={control}
            name="ubicacion_suelo"
            render={({ field, fieldState }) => (
              <Field label="Clasificación del suelo" error={fieldState.error?.message}>
                <ToggleGroup
                  value={field.value as "urbanizado" | "no_urbanizable"}
                  onChange={field.onChange}
                  options={[
                    { value: "urbanizado", label: "Urbanizado" },
                    { value: "no_urbanizable", label: "No urbanizable" },
                  ]}
                  cols={2}
                />
              </Field>
            )}
          />
          <Controller
            control={control}
            name="requiere_acceso_conexion"
            render={({ field, fieldState }) => (
              <Field label="¿Requiere acceso y conexión a la red de distribución?" error={fieldState.error?.message}>
                <BoolToggle value={field.value ?? false} onChange={field.onChange} />
              </Field>
            )}
          />
        </>
      )}

      <CamposSegunNormativa
        campos={["implantacion", "instalacion_origen_modificada", "requiere_registro_produccion"]}
      />
    </>
  );
}

function CamposIRVE() {
  const { control, watch } = useFormContext<FormState>();

  const potenciaPuntoKw = watch("potencia_por_punto_kw");
  const numeroPuntos = watch("numero_puntos");
  const requiereSuministro = watch("requiere_nuevo_suministro");
  const accesoPublico = watch("acceso_publico");
  const comunidad = watch("comunidad");
  const ubicacionIrve = watch("ubicacion_irve");
  const mostrarCamposGarajeCataluna =
    comunidad === "cataluna" && ubicacionIrve === "garaje_comunitario";
  
  const potenciaPunto = parseFloat(potenciaPuntoKw) || 0;
  const numPuntos = parseInt(numeroPuntos) || 1;
  const potenciaTotal = potenciaPunto * numPuntos;

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Controller
          control={control}
          name="numero_puntos"
          render={({ field, fieldState }) => (
            <Field label="Número de puntos de recarga" error={fieldState.error?.message}>
              <NumberInput
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="1"
                min={1}
                step={1}
              />
            </Field>
          )}
        />
        <Controller
          control={control}
          name="potencia_por_punto_kw"
          render={({ field, fieldState }) => (
            <Field label="Potencia por punto (kW)" error={fieldState.error?.message}>
              <NumberInput
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="7.4"
                min={1.4}
                suffix="kW"
              />
            </Field>
          )}
        />
      </div>

      {potenciaTotal > 0 && (
        <div className="rounded-lg bg-bg border border-border px-4 py-3 text-sm">
          <span className="text-text-secondary">Potencia total calculada: </span>
          <span className="font-medium text-text-primary">{potenciaTotal.toFixed(1)} kW</span>
        </div>
      )}

      <Controller
        control={control}
        name="modo_recarga"
        render={({ field, fieldState }) => (
          <Field label="Modo de recarga" error={fieldState.error?.message}>
            <ToggleGroup
              value={field.value as "1" | "2" | "3" | "4"}
              onChange={field.onChange}
              options={[
                { value: "1", label: "Modo 1", description: "≤16 A, sin piloto" },
                { value: "2", label: "Modo 2", description: "Cable con caja" },
                { value: "3", label: "Modo 3", description: "7,4–22 kW AC" },
                { value: "4", label: "Modo 4 (DC)", description: "22–350 kW" },
              ]}
              cols={4}
            />
          </Field>
        )}
      />

      <SectionDivider label="Características" />

      <Controller
        control={control}
        name="ubicacion_irve"
        render={({ field, fieldState }) => (
          <Field label="Ubicación de la instalación" error={fieldState.error?.message}>
            <ToggleGroup
              value={field.value as "interior" | "exterior" | "via_publica" | "garaje_comunitario"}
              onChange={field.onChange}
              options={[
                { value: "interior", label: "Interior privado" },
                { value: "garaje_comunitario", label: "Garaje comunitario" },
                { value: "exterior", label: "Exterior" },
                { value: "via_publica", label: "Vía pública" },
              ]}
              cols={2}
            />
          </Field>
        )}
      />

      <Controller
        control={control}
        name="acceso_publico"
        render={({ field, fieldState }) => (
          <Field
            label="¿La instalación es de acceso público?"
            error={fieldState.error?.message}
            hint={
              accesoPublico
                ? "El acceso público activa la tramitación TECI y el registro obligatorio en MITECO."
                : "Las instalaciones privadas tramitan por PUES en Industria de la CC. AA."
            }
          >
            <BoolToggle
              value={field.value}
              onChange={field.onChange}
              labelTrue="Sí (acceso público — TECI / MITECO)"
              labelFalse="No (uso privado — PUES)"
            />
          </Field>
        )}
      />

      <Controller
        control={control}
        name="requiere_nuevo_suministro"
        render={({ field, fieldState }) => (
          <Field label="¿Requiere nuevo suministro o aumento de potencia contratada?" error={fieldState.error?.message}>
            <BoolToggle
              value={field.value}
              onChange={field.onChange}
            />
          </Field>
        )}
      />

      {requiereSuministro && (
        <InfoBanner>
          Se añadirán trámites de solicitud de acceso a la red y coordinación con
          la distribuidora de zona.
        </InfoBanner>
      )}

      {mostrarCamposGarajeCataluna && (
        <>
          <SectionDivider label="Garaje comunitario — datos exigidos en Cataluña (ITC-BT-04)" />
          <Controller
            control={control}
            name="uso_edificio"
            render={({ field, fieldState }) => (
              <Field label="Uso del edificio" error={fieldState.error?.message}>
                <ToggleGroup
                  value={field.value as "residencial" | "no_residencial"}
                  onChange={field.onChange}
                  options={[
                    { value: "residencial", label: "Residencial" },
                    { value: "no_residencial", label: "No residencial" },
                  ]}
                  cols={2}
                />
              </Field>
            )}
          />
          <Controller
            control={control}
            name="ventilacion_garaje"
            render={({ field, fieldState }) => (
              <Field label="Tipo de ventilación del garaje" error={fieldState.error?.message}>
                <ToggleGroup
                  value={field.value as "natural" | "forzada"}
                  onChange={field.onChange}
                  options={[
                    { value: "natural", label: "Natural" },
                    { value: "forzada", label: "Forzada" },
                  ]}
                  cols={2}
                />
              </Field>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={control}
              name="numero_plazas_garaje"
              render={({ field, fieldState }) => (
                <Field label="Número de plazas del garaje" error={fieldState.error?.message}>
                  <NumberInput value={field.value ?? ""} onChange={field.onChange} placeholder="ej. 20" min={0} step={1} />
                </Field>
              )}
            />
            <Controller
              control={control}
              name="garaje_existente"
              render={({ field, fieldState }) => (
                <Field label="¿Garaje existente?" error={fieldState.error?.message}>
                  <BoolToggle value={field.value ?? false} onChange={field.onChange} />
                </Field>
              )}
            />
          </div>
        </>
      )}

      <CamposSegunNormativa
        campos={["instalacion_origen_modificada", "numero_suministros_edificio"]}
      />

      <CamposDatosElectricos />
    </>
  );
}

function CamposGas() {
  const { control, watch } = useFormContext<FormState>();
  const comunidad = watch("comunidad");
  const esAmpliacion = watch("es_ampliacion");
  const requiereDatosResultantes = comunidad === "madrid" || comunidad === "cataluna";

  return (
    <>
      <CamposPotenciaBase />

      <Controller
        control={control}
        name="combustible"
        render={({ field, fieldState }) => (
          <Field label="Tipo de combustible" error={fieldState.error?.message}>
            <ToggleGroup
              value={field.value as "gas_natural" | "glp_deposito" | "glp_envases"}
              onChange={field.onChange}
              options={[
                { value: "gas_natural", label: "Gas natural" },
                { value: "glp_deposito", label: "GLP (depósito)" },
                { value: "glp_envases", label: "GLP (envases)" },
              ]}
              cols={3}
            />
          </Field>
        )}
      />

      <Controller
        control={control}
        name="presion_bar"
        render={({ field, fieldState }) => (
          <Field
            label="Rango de presión de la red"
            error={fieldState.error?.message}
            hint="La presión 5+ bar requiere proyecto técnico firmado por ingeniero."
          >
            <ToggleGroup
              value={field.value as "normal" | "5+"}
              onChange={field.onChange}
              options={[
                { value: "normal", label: "Presión normal (< 5 bar)" },
                { value: "5+", label: "Alta presión (≥ 5 bar)" },
              ]}
              cols={2}
            />
          </Field>
        )}
      />

      {requiereDatosResultantes && (
        <>
          <SectionDivider label="Datos de la instalación resultante (exigidos en Madrid y Cataluña)" />
          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={control}
              name="potencia_resultante_kw"
              render={({ field, fieldState }) => (
                <Field label="Potencia resultante (kW)" error={fieldState.error?.message}>
                  <NumberInput value={field.value ?? ""} onChange={field.onChange} placeholder="ej. 24" min={0} suffix="kW" />
                </Field>
              )}
            />
            <Controller
              control={control}
              name="presion_resultante_bar"
              render={({ field, fieldState }) => (
                <Field label="Presión resultante (bar)" error={fieldState.error?.message}>
                  <NumberInput value={field.value ?? ""} onChange={field.onChange} placeholder="ej. 0.05" min={0} suffix="bar" />
                </Field>
              )}
            />
          </div>
          <Controller
            control={control}
            name="es_ampliacion"
            render={({ field, fieldState }) => (
              <Field label="¿Es una ampliación de instalación existente?" error={fieldState.error?.message}>
                <BoolToggle value={field.value ?? false} onChange={field.onChange} />
              </Field>
            )}
          />
          {esAmpliacion && (
            <Controller
              control={control}
              name="incremento_potencia_pct"
              render={({ field, fieldState }) => (
                <Field label="Incremento de potencia respecto a la original (%)" error={fieldState.error?.message}>
                  <NumberInput value={field.value ?? ""} onChange={field.onChange} placeholder="ej. 20" min={0} suffix="%" />
                </Field>
              )}
            />
          )}
        </>
      )}

      <CamposSegunNormativa campos={["clase_instalacion_gas"]} />
    </>
  );
}

function CamposClimatizacionACS() {
  const { control, watch } = useFormContext<FormState>();
  const tipoInstalacion = watch("tipo_instalacion");
  const comunidad = watch("comunidad");
  const potencia = parseFloat(watch("potencia_kw"));
  const acsCentralizada = watch("acs_centralizada");
  const esACS = tipoInstalacion === "acs";
  const esCataluna = comunidad === "cataluna";
  const legionellaMaterial = esACS && (acsCentralizada === true || (!Number.isNaN(potencia) && potencia >= 70));

  return (
    <>
      <CamposPotenciaBase />
      <Controller
        control={control}
        name="superficie_m2"
        render={({ field, fieldState }) => (
          <Field label="Superficie climatizada (m²)" hint="Opcional. El RITE se aplica por potencia térmica, no por superficie: este dato no cambia los trámites, se guarda como contexto para la memoria o el proyecto." error={fieldState.error?.message}>
            <NumberInput
              value={field.value ?? ""}
              onChange={field.onChange}
              placeholder="ej. 200"
              min={0}
              suffix="m²"
            />
          </Field>
        )}
      />

      {esACS && (
        <>
          <SectionDivider label="Datos de la instalación de ACS" />
          <Controller
            control={control}
            name="acs_centralizada"
            render={({ field, fieldState }) => (
              <Field label="¿La instalación de ACS es de uso centralizado (edificio)?" error={fieldState.error?.message}>
                <BoolToggle value={field.value ?? false} onChange={field.onChange} />
              </Field>
            )}
          />

          {esCataluna && legionellaMaterial && (
            <>
              <Controller
                control={control}
                name="incluida_ambito_legionella"
                render={({ field, fieldState }) => (
                  <Field
                    label="¿Está incluida en el ámbito de prevención de Legionela?"
                    hint="Obligatorio en Cataluña (Decret 352/2004) para ACS centralizada o de ≥70 kW."
                    error={fieldState.error?.message}
                  >
                    <BoolToggle value={field.value ?? false} onChange={field.onChange} />
                  </Field>
                )}
              />

              {acsCentralizada === true && potencia > 70 && (
                <div className="grid grid-cols-2 gap-4">
                  <Controller
                    control={control}
                    name="dispone_acumulacion"
                    render={({ field, fieldState }) => (
                      <Field label="¿Dispone de acumulación?" error={fieldState.error?.message}>
                        <BoolToggle value={field.value ?? false} onChange={field.onChange} />
                      </Field>
                    )}
                  />
                  <Controller
                    control={control}
                    name="dispone_circuito_retorno"
                    render={({ field, fieldState }) => (
                      <Field label="¿Dispone de circuito de retorno?" error={fieldState.error?.message}>
                        <BoolToggle value={field.value ?? false} onChange={field.onChange} />
                      </Field>
                    )}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}

      <CamposSegunNormativa
        campos={[
          "uso_colectivo",
          "acumulacion",
          "recirculacion",
          "incluida_ambito_rd_487_2022",
        ]}
      />
    </>
  );
}

// ─── Componente raíz del paso 2 ───────────────────────────────────────────────

const STEP2_MAP: Record<string, () => JSX.Element> = {
  fotovoltaica_autoconsumo: CamposFotovoltaica,
  irve: CamposIRVE,
  gas_baja_presion: CamposGas,
  climatizacion_aerotermia: CamposClimatizacionACS,
  acs: CamposClimatizacionACS,
};

export function Step2ParametrosTecnicos() {
  const { watch } = useFormContext<FormState>();
  const tipoInstalacion = watch("tipo_instalacion");
  
  const VerticalForm = STEP2_MAP[tipoInstalacion] ?? CamposPotenciaBase;
  
  return (
    <div className="flex flex-col gap-5">
      <VerticalForm />
    </div>
  );
}
