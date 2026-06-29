/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
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
  const inputRef = useRef<HTMLInputElement>(null);

  // Google Places Autocomplete — solo para municipio
  useEffect(() => {
    const el = inputRef.current;
    if (!el || typeof window === "undefined" || !(window as any).google?.maps?.places) return;

    const ac = new (window as any).google.maps.places.Autocomplete(el, {
      types: ["(cities)"],
      componentRestrictions: { country: "es" },
      fields: ["name", "address_components"],
    });

    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      if (place?.name) onChange({ municipio: place.name });
    });
  }, [onChange]);

  const cobertura = tieneCobertura(state.tipo_instalacion, state.comunidad);

  return (
    <div className="flex flex-col gap-5">
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&libraries=places`}
        strategy="lazyOnload"
      />

      {/* Tipo de instalación */}
      <Field label="Tipo de instalación">
        <Select
          value={state.tipo_instalacion}
          onChange={(v) => onChange({ tipo_instalacion: v })}
          options={TIPO_OPTIONS}
        />
      </Field>

      {/* Comunidad autónoma */}
      <Field label="Comunidad autónoma">
        <Select
          value={state.comunidad}
          onChange={(v) => onChange({ comunidad: v })}
          options={COMUNIDAD_OPTIONS}
        />
      </Field>

      {/* Aviso de cobertura */}
      {!cobertura && (
        <InfoBanner type="warning">
          Esta combinación está en desarrollo. Solo Andalucía tiene los 5
          verticales completos; el resto de CCAA dispone de fotovoltaica.
        </InfoBanner>
      )}

      {/* Municipio con autocomplete */}
      <Field
        label="Municipio"
        hint="Escribe al menos 3 letras para ver sugerencias."
      >
        <input
          ref={inputRef}
          type="text"
          value={state.municipio}
          onChange={(e) => onChange({ municipio: e.target.value })}
          placeholder="Sevilla, Málaga, Granada…"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition-colors hover:border-neutral focus:border-primary focus:ring-1 focus:ring-primary/20"
        />
      </Field>

      {/* Uso */}
      <Field label="Uso de la instalación">
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
