"use client";

import { useFormContext, Controller } from "react-hook-form";
import { type FormState } from "./types";
import {
  Field,
  NumberInput,
  ToggleGroup,
  BoolToggle,
  SectionDivider,
  InfoBanner,
} from "./FormPrimitives";

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
            value={field.value}
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
  
  return (
    <>
      <CamposPotenciaBase 
        hint="Para fotovoltaica (RD 244/2019), introduce la potencia máxima del inversor (potencia nominal), NO la potencia pico de los paneles."
      />

      <Controller
        control={control}
        name="superficie_m2"
        render={({ field, fieldState }) => (
          <Field label="Superficie del generador (m²)" hint="Opcional. Se usa para verificar la coherencia con la potencia." error={fieldState.error?.message}>
            <NumberInput
              value={field.value}
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
          Instalaciones superiores a 100 kW requieren autorización administrativa
          previa en Andalucía (no PUES).
        </InfoBanner>
      )}

      <CamposDatosElectricos />

      <Controller
        control={control}
        name="modalidad_autoconsumo"
        render={({ field, fieldState }) => (
          <Field label="Modalidad de Autoconsumo" error={fieldState.error?.message}>
            <ToggleGroup
              value={field.value as "sin_excedentes" | "con_excedentes"}
              onChange={field.onChange}
              options={[
                { value: "sin_excedentes", label: "Sin excedentes" },
                { value: "con_excedentes", label: "Con excedentes" },
              ]}
              cols={2}
            />
          </Field>
        )}
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
                value={field.value}
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
                value={field.value}
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

      <CamposDatosElectricos />
    </>
  );
}

function CamposGas() {
  const { control } = useFormContext<FormState>();
  
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
    </>
  );
}

function CamposClimatizacionACS() {
  const { control } = useFormContext<FormState>();
  
  return (
    <>
      <CamposPotenciaBase />
      <Controller
        control={control}
        name="superficie_m2"
        render={({ field, fieldState }) => (
          <Field label="Superficie climatizada (m²)" hint="Necesaria para clasificar si aplica RITE completo." error={fieldState.error?.message}>
            <NumberInput
              value={field.value}
              onChange={field.onChange}
              placeholder="ej. 200"
              min={0}
              suffix="m²"
            />
          </Field>
        )}
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
