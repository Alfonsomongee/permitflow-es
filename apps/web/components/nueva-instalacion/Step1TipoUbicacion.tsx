"use client";

import { useFormContext, Controller } from "react-hook-form";
import {
  type FormState,
  TIPO_OPTIONS,
  COMUNIDAD_OPTIONS,
  USO_OPTIONS,
  nivelCobertura,
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
  const cobertura = nivelCobertura(tipoInstalacion, comunidad);

  return (
    <div className="flex flex-col gap-5">
      <Controller
        control={control}
        name="tipo_instalacion"
        render={({ field, fieldState }) => (
          <Field label="Tipo de instalación" error={fieldState.error?.message}>
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
          <Field label="Comunidad autónoma" error={fieldState.error?.message}>
            <Select
              value={field.value}
              onChange={field.onChange}
              options={COMUNIDAD_OPTIONS}
            />
          </Field>
        )}
      />

      {cobertura === "generica_grave" && (
        <InfoBanner type="warning">
          Esta combinación se basa en normativa genérica o en borrador, aún no
          verificada específicamente para esta comunidad. Contrasta plataformas,
          tasas y organismos antes de presentar.
        </InfoBanner>
      )}
      {cobertura === "atencion" && (
        <InfoBanner type="info">
          Esta combinación está verificada con observaciones: la mayoría de
          trámites son fiables, pero persisten algunos huecos documentados que
          se muestran en el plan generado.
        </InfoBanner>
      )}

      <Controller
        control={control}
        name="uso"
        render={({ field, fieldState }) => (
          <Field label="Uso de la instalación" error={fieldState.error?.message}>
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
