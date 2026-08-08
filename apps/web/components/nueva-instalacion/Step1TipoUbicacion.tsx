"use client";

import { useState } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { CheckCircle2 } from "lucide-react";
import {
  type FormState,
  TIPO_OPTIONS,
  COMUNIDAD_OPTIONS,
  COMUNIDAD_LABEL,
  USO_OPTIONS,
  nivelCobertura,
} from "./types";
import {
  Field,
  Select,
  ToggleGroup,
  InfoBanner,
} from "./FormPrimitives";
import { AutocompleteDireccion } from "./AutocompleteDireccion";

export function Step1TipoUbicacion() {
  const { control, watch, setValue } = useFormContext<FormState>();

  const tipoInstalacion = watch("tipo_instalacion");
  const comunidad = watch("comunidad");
  const cobertura = nivelCobertura(tipoInstalacion, comunidad);
  const [sugerenciaDireccion, setSugerenciaDireccion] = useState<string | null>(null);

  const handleComunidadResuelta = (comunidadResuelta: string | null, direccion: string) => {
    if (comunidadResuelta && COMUNIDAD_LABEL[comunidadResuelta]) {
      setValue("comunidad", comunidadResuelta, { shouldValidate: true, shouldDirty: true });
      setSugerenciaDireccion(direccion);
    } else {
      setSugerenciaDireccion(null);
    }
  };

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

      <Field label="Dirección (opcional)" hint="Autocompleta la comunidad autónoma de abajo; puedes corregirla si hace falta.">
        <AutocompleteDireccion onComunidadResuelta={handleComunidadResuelta} />
      </Field>

      <Controller
        control={control}
        name="comunidad"
        render={({ field, fieldState }) => (
          <Field label="Comunidad autonoma" error={fieldState.error?.message}>
            <Select
              value={field.value}
              onChange={(v) => {
                field.onChange(v);
                setSugerenciaDireccion(null);
              }}
              options={COMUNIDAD_OPTIONS}
            />
            {sugerenciaDireccion && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-success-dark">
                <CheckCircle2 size={12} aria-hidden />
                Detectada a partir de &quot;{sugerenciaDireccion}&quot;
              </p>
            )}
          </Field>
        )}
      />

      {cobertura === "generica_grave" && (
        <InfoBanner type="warning">
          Esta combinacion se basa en normativa generica/borrador aun no
          verificada especificamente para esta comunidad. Contrasta plataformas,
          tasas y organismos antes de presentar.
        </InfoBanner>
      )}
      {cobertura === "atencion" && (
        <InfoBanner type="info">
          Esta combinacion esta verificada con observaciones: la mayoria de
          tramites son fiables, pero persisten algunos huecos documentados que
          se muestran en el plan generado.
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
