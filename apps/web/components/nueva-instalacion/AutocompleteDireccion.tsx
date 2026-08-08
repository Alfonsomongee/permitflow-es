"use client";

import { useEffect, useRef, useState } from "react";
import { Autocomplete } from "@base-ui/react/autocomplete";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Sugerencia {
  value: string; // placeId
  label: string; // texto formateado
}

interface AutocompleteDireccionProps {
  /** Se llama cuando se resuelve una comunidad a partir de la dirección elegida.
   * Solo rellena una sugerencia inicial -- el desplegable de comunidad sigue
   * siendo la fuente de verdad y el usuario puede corregirlo. */
  onComunidadResuelta: (comunidad: string | null, direccion: string) => void;
}

/**
 * apps/web/components/nueva-instalacion/AutocompleteDireccion.tsx
 *
 * Campo opcional de dirección: autocompleta contra Google Places (New) vía
 * /api/geocodificar y, al elegir una sugerencia, resuelve la comunidad
 * autónoma para pre-rellenar el desplegable de abajo (mejora 2026-08-08).
 * No sustituye al selector manual de comunidad -- solo lo agiliza.
 */
export function AutocompleteDireccion({ onComunidadResuelta }: AutocompleteDireccionProps) {
  const [query, setQuery] = useState("");
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [cargandoSugerencias, setCargandoSugerencias] = useState(false);
  const [resolviendo, setResolviendo] = useState(false);
  const [noDisponible, setNoDisponible] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (noDisponible || query.trim().length < 3) {
      setSugerencias([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setCargandoSugerencias(true);
      try {
        const res = await fetch(`/api/geocodificar?q=${encodeURIComponent(query)}`);
        if (res.status === 501) {
          setNoDisponible(true);
          setSugerencias([]);
          return;
        }
        const data = await res.json();
        setSugerencias(
          (data.sugerencias ?? []).map((s: { placeId: string; texto: string }) => ({
            value: s.placeId,
            label: s.texto,
          }))
        );
      } catch {
        setSugerencias([]);
      } finally {
        setCargandoSugerencias(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, noDisponible]);

  if (noDisponible) return null;

  const seleccionar = async (sugerencia: Sugerencia) => {
    setResolviendo(true);
    try {
      const res = await fetch(`/api/geocodificar/${encodeURIComponent(sugerencia.value)}`);
      const data = await res.json();
      onComunidadResuelta(data.comunidad ?? null, data.direccionFormateada ?? sugerencia.label);
    } catch {
      onComunidadResuelta(null, sugerencia.label);
    } finally {
      setResolviendo(false);
    }
  };

  return (
    <Autocomplete.Root
      items={sugerencias}
      value={query}
      onValueChange={setQuery}
      mode="none"
    >
      <Autocomplete.InputGroup className="relative">
        <MapPin
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
          aria-hidden
        />
        <Autocomplete.Input
          placeholder="Escribe la dirección para autocompletar la comunidad (opcional)"
          className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-8 text-sm text-text-primary outline-none transition-colors hover:border-neutral focus:border-primary focus:ring-1 focus:ring-primary/20"
        />
        {(cargandoSugerencias || resolviendo) && (
          <Loader2
            size={14}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-text-secondary"
            aria-hidden
          />
        )}
      </Autocomplete.InputGroup>

      <Autocomplete.Portal>
        <Autocomplete.Positioner sideOffset={6} className="z-50 outline-none">
          <Autocomplete.Popup className="max-h-64 w-[var(--anchor-width)] overflow-y-auto rounded-lg border border-border bg-surface p-1 text-sm shadow-dropdown outline-none">
            <Autocomplete.Empty className="px-2.5 py-2 text-xs text-text-secondary">
              {query.trim().length < 3 ? "Escribe al menos 3 caracteres…" : "Sin resultados."}
            </Autocomplete.Empty>
            <Autocomplete.List>
              {(sugerencia: Sugerencia) => (
                <Autocomplete.Item
                  key={sugerencia.value}
                  value={sugerencia}
                  onClick={() => seleccionar(sugerencia)}
                  className={cn(
                    "flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-text-primary outline-none transition-colors data-[highlighted]:bg-bg"
                  )}
                >
                  {sugerencia.label}
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
}
