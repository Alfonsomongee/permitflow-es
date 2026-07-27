"use client";

import { useFormContext, Controller } from "react-hook-form";
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

export function Step1TipoUbicacion() {
  const { control, watch } = useFormContext<FormState>();
  
  const tipoInstalacion = watch("tipo_instalacion");
  const comunidad = watch("comunidad");
  const cobertura = tieneCobertura(tipoInstalacion, comunidad);

  return (
    <div className="flex flex-col gap-5">
      <Controller
        control={control}
        name="tipo_instalacion"
        render={({ field, fieldState }) => (
          <Field label="Tipo de instalacion" error={fieldState.error?.message}>
            <Select
              value={field.value}
              onChange={field.onChange}
              options={TIPO_OPTIONS}
            />
          </Field>
        )}
      />

      <Controller
        control={control}
        name="comunidad"
        render={({ field, fieldState }) => (
          <Field label="Comunidad autonoma" error={fieldState.error?.message}>
            <Select
              value={field.value}
              onChange={field.onChange}
              options={COMUNIDAD_OPTIONS}
            />
          </Field>
        )}
      />

      {!cobertura && (
        <InfoBanner type="warning">
          Esta combinacion esta en desarrollo. Solo Andalucia tiene los 5
          verticales completos; el resto de CCAA dispone de fotovoltaica.
        </InfoBanner>
      )}

      <Controller
        control={control}
        name="uso"
        render={({ field, fieldState }) => (
          <Field label="Uso de la instalacion" error={fieldState.error?.message}>
            <ToggleGroup
              value={field.value as "residencial" | "terciario" | "industrial"}
              onChange={field.onChange}
              options={USO_OPTIONS}
              cols={3}
            />
          </Field>
        )}
      />
    </div>
  );
}
