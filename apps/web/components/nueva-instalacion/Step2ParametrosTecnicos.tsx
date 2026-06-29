"use client";

import { type FormState } from "./types";
import {
  Field,
  NumberInput,
  ToggleGroup,
  BoolToggle,
  SectionDivider,
  InfoBanner,
} from "./FormPrimitives";

interface Step2Props {
  state: FormState;
  onChange: (patch: Partial<FormState>) => void;
}

// ─── Sub-formularios por vertical ────────────────────────────────────────────

function CamposPotenciaBase({ state, onChange }: Step2Props) {
  return (
    <Field label="Potencia total de la instalación (kW)">
      <NumberInput
        value={state.potencia_kw}
        onChange={(v) => onChange({ potencia_kw: v })}
        placeholder="ej. 9.9"
        min={0}
        suffix="kW"
      />
    </Field>
  );
}

function CamposFotovoltaica({ state, onChange }: Step2Props) {
  return (
    <>
      <CamposPotenciaBase state={state} onChange={onChange} />

      <Field label="Superficie del generador (m²)" hint="Opcional. Se usa para verificar la coherencia con la potencia.">
        <NumberInput
          value={state.superficie_m2}
          onChange={(v) => onChange({ superficie_m2: v })}
          placeholder="ej. 50"
          min={0}
          suffix="m²"
        />
      </Field>

      {parseFloat(state.potencia_kw) > 100 && (
        <InfoBanner>
          Instalaciones superiores a 100 kW requieren autorización administrativa
          previa en Andalucía (no PUES).
        </InfoBanner>
      )}
    </>
  );
}

function CamposIRVE({ state, onChange }: Step2Props) {
  const potenciaPunto = parseFloat(state.potencia_por_punto_kw) || 0;
  const numPuntos = parseInt(state.numero_puntos) || 1;
  const potenciaTotal = potenciaPunto * numPuntos;

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Número de puntos de recarga">
          <NumberInput
            value={state.numero_puntos}
            onChange={(v) => onChange({ numero_puntos: v })}
            placeholder="1"
            min={1}
            step={1}
          />
        </Field>
        <Field label="Potencia por punto (kW)">
          <NumberInput
            value={state.potencia_por_punto_kw}
            onChange={(v) => onChange({ potencia_por_punto_kw: v })}
            placeholder="7.4"
            min={1.4}
            suffix="kW"
          />
        </Field>
      </div>

      {potenciaTotal > 0 && (
        <div className="rounded-lg bg-bg border border-border px-4 py-3 text-sm">
          <span className="text-text-secondary">Potencia total calculada: </span>
          <span className="font-medium text-text-primary">{potenciaTotal.toFixed(1)} kW</span>
        </div>
      )}

      <Field label="Modo de recarga">
        <ToggleGroup
          value={state.modo_recarga as "1" | "2" | "3" | "4"}
          onChange={(v) => onChange({ modo_recarga: v })}
          options={[
            { value: "1", label: "Modo 1", description: "≤16 A, sin piloto" },
            { value: "2", label: "Modo 2", description: "Cable con caja" },
            { value: "3", label: "Modo 3", description: "7,4–22 kW AC" },
            { value: "4", label: "Modo 4 (DC)", description: "22–350 kW" },
          ]}
          cols={4}
        />
      </Field>

      <SectionDivider label="Características" />

      <Field label="Ubicación de la instalación">
        <ToggleGroup
          value={state.ubicacion_irve as "interior" | "exterior" | "via_publica" | "garaje_comunitario"}
          onChange={(v) => onChange({ ubicacion_irve: v })}
          options={[
            { value: "interior", label: "Interior privado" },
            { value: "garaje_comunitario", label: "Garaje comunitario" },
            { value: "exterior", label: "Exterior" },
            { value: "via_publica", label: "Vía pública" },
          ]}
          cols={2}
        />
      </Field>

      <Field
        label="¿La instalación es de acceso público?"
        hint={
          state.acceso_publico
            ? "El acceso público activa la tramitación TECI y el registro obligatorio en MITECO."
            : "Las instalaciones privadas tramitan por PUES en Industria de la CC. AA."
        }
      >
        <BoolToggle
          value={state.acceso_publico}
          onChange={(v) => onChange({ acceso_publico: v })}
          labelTrue="Sí (acceso público — TECI / MITECO)"
          labelFalse="No (uso privado — PUES)"
        />
      </Field>

      <Field label="¿Requiere nuevo suministro o aumento de potencia contratada?">
        <BoolToggle
          value={state.requiere_nuevo_suministro}
          onChange={(v) => onChange({ requiere_nuevo_suministro: v })}
        />
      </Field>

      {state.requiere_nuevo_suministro && (
        <InfoBanner>
          Se añadirán trámites de solicitud de acceso a la red y coordinación con
          la distribuidora de zona.
        </InfoBanner>
      )}
    </>
  );
}

function CamposGas({ state, onChange }: Step2Props) {
  return (
    <>
      <CamposPotenciaBase state={state} onChange={onChange} />

      <Field label="Tipo de combustible">
        <ToggleGroup
          value={state.combustible as "gas_natural" | "glp_deposito" | "glp_envases"}
          onChange={(v) => onChange({ combustible: v })}
          options={[
            { value: "gas_natural", label: "Gas natural" },
            { value: "glp_deposito", label: "GLP (depósito)" },
            { value: "glp_envases", label: "GLP (envases)" },
          ]}
          cols={3}
        />
      </Field>

      <Field
        label="Rango de presión de la red"
        hint="La presión 5+ bar requiere proyecto técnico firmado por ingeniero."
      >
        <ToggleGroup
          value={state.presion_bar as "normal" | "5+"}
          onChange={(v) => onChange({ presion_bar: v })}
          options={[
            { value: "normal", label: "Presión normal (< 5 bar)" },
            { value: "5+", label: "Alta presión (≥ 5 bar)" },
          ]}
          cols={2}
        />
      </Field>
    </>
  );
}

function CamposClimatizacionACS({ state, onChange }: Step2Props) {
  return (
    <>
      <CamposPotenciaBase state={state} onChange={onChange} />
      <Field label="Superficie climatizada (m²)" hint="Necesaria para clasificar si aplica RITE completo.">
        <NumberInput
          value={state.superficie_m2}
          onChange={(v) => onChange({ superficie_m2: v })}
          placeholder="ej. 200"
          min={0}
          suffix="m²"
        />
      </Field>
    </>
  );
}

// ─── Componente raíz del paso 2 ───────────────────────────────────────────────

const STEP2_MAP: Record<string, (p: Step2Props) => JSX.Element> = {
  fotovoltaica_autoconsumo: CamposFotovoltaica,
  irve: CamposIRVE,
  gas_baja_presion: CamposGas,
  climatizacion_aerotermia: CamposClimatizacionACS,
  acs: CamposClimatizacionACS,
};

export function Step2ParametrosTecnicos({ state, onChange }: Step2Props) {
  const VerticalForm = STEP2_MAP[state.tipo_instalacion] ?? CamposPotenciaBase;
  return (
    <div className="flex flex-col gap-5">
      <VerticalForm state={state} onChange={onChange} />
    </div>
  );
}
