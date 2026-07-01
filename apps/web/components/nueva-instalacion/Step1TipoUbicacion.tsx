"use client";

import { useEffect, useRef, useState } from "react";
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

interface GooglePlace {
  name?: string;
}

interface GoogleMapsListener {
  remove?: () => void;
}

interface GoogleAutocomplete {
  addListener: (
    eventName: "place_changed",
    callback: () => void
  ) => GoogleMapsListener;
  getPlace: () => GooglePlace;
}

interface GoogleMapsWindow extends Window {
  google?: {
    maps?: {
      places?: {
        Autocomplete: new (
          input: HTMLInputElement,
          options: {
            types: string[];
            componentRestrictions: { country: string };
            fields: string[];
          }
        ) => GoogleAutocomplete;
      };
      event?: {
        removeListener: (listener: GoogleMapsListener) => void;
      };
    };
  };
}

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export function Step1TipoUbicacion({ state, onChange }: Step1Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    const el = inputRef.current;
    const maps = (window as GoogleMapsWindow).google?.maps;
    const Autocomplete = maps?.places?.Autocomplete;

    if (!el || !scriptLoaded || !Autocomplete) return;

    const autocomplete = new Autocomplete(el, {
      types: ["(cities)"],
      componentRestrictions: { country: "es" },
      fields: ["name", "address_components"],
    });

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (place.name) onChange({ municipio: place.name });
    });

    return () => {
      if (listener.remove) {
        listener.remove();
        return;
      }
      maps?.event?.removeListener(listener);
    };
  }, [onChange, scriptLoaded]);

  const cobertura = tieneCobertura(state.tipo_instalacion, state.comunidad);

  return (
    <div className="flex flex-col gap-5">
      {googleMapsApiKey && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`}
          strategy="afterInteractive"
          onLoad={() => setScriptLoaded(true)}
        />
      )}

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

      <Field
        label="Municipio"
        hint={
          googleMapsApiKey
            ? "Escribe al menos 3 letras para ver sugerencias."
            : "Autocomplete desactivado hasta configurar Google Maps."
        }
      >
        <input
          ref={inputRef}
          type="text"
          value={state.municipio}
          onChange={(e) => onChange({ municipio: e.target.value })}
          placeholder="Sevilla, Malaga, Granada..."
          className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition-colors hover:border-neutral focus:border-primary focus:ring-1 focus:ring-primary/20"
        />
      </Field>

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
