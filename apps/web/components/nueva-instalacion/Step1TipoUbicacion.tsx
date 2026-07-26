"use client";

import {
  type FormState,
  TIPO_OPTIONS,
  COMUNIDAD_OPTIONS,
  USO_OPTIONS,
  tieneCobertura,
} from "./types";
import {
  Field,
  Select,
  ToggleGroup,
  InfoBanner,
} from "./FormPrimitives";

interface Step1Props {
  state: FormState;
  onChange: (patch: Partial<FormState>) => void;
}

export function Step1TipoUbicacion({ state, onChange }: Step1Props) {
  const cobertura = tieneCobertura(state.tipo_instalacion, state.comunidad);

  return (
    <div className="flex flex-col gap-5">
      <Field label="Tipo de instalacion">
        <Select
          value={state.tipo_instalacion}
          onChange={(v) => onChange({ tipo_instalacion: v })}
          options={TIPO_OPTIONS}
        />
      </Field>

      <Field label="Comunidad autonoma">
        <Select
          value={state.comunidad}
          onChange={(v) => onChange({ comunidad: v })}
          options={COMUNIDAD_OPTIONS}
        />
      </Field>

      {!cobertura && (
        <InfoBanner type="warning">
          Esta combinacion esta en desarrollo. Solo Andalucia tiene los 5
          verticales completos; el resto de CCAA dispone de fotovoltaica.
        </InfoBanner>
      )}

      <Field label="Uso de la instalacion">
        <ToggleGroup
          value={state.uso as "residencial" | "terciario" | "industrial"}
          onChange={(v) => onChange({ uso: v })}
          options={USO_OPTIONS}
          cols={3}
        />
      </Field>
    </div>
  );
}
