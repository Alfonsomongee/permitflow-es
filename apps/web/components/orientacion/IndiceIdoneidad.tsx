"use client";

import { useState } from "react";
import { Loader2, MapPin, AlertCircle, Info, Sun, Thermometer } from "lucide-react";
import type { FichaTecnologia } from "@/content/tecnologias";

type Props = {
  tecnologiaId: FichaTecnologia["id"];
};

export type IdoneidadResult = {
  ubicacion: {
    lat: number;
    lon: number;
    comunidad: string;
    zona_climatica_cte?: string;
    zona_climatica_origen?: string;
    zona_climatica_aproximada?: boolean;
  };
  idoneidad: {
    fotovoltaica_autoconsumo: {
      disponible: boolean;
      produccion_especifica_kwh_kwp_year?: number;
      radiacion_anual_kwh_m2?: number;
      banda?: "excelente" | "buena" | "moderada" | "baja";
    };
    climatizacion_aerotermia: {
      disponible: boolean;
      zona_climatica?: string;
      banda?: string;
    };
  };
  aviso: string;
};

type Props = {
  tecnologiaId: FichaTecnologia["id"];
  onResult?: (result: IdoneidadResult | null) => void;
};

export function IndiceIdoneidad({ tecnologiaId, onResult }: Props) {
  const [municipio, setMunicipio] = useState("");
  const [provincia, setProvincia] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IdoneidadResult | null>(null);

  // Solo fotovoltaica y aerotermia tienen índices geográficos específicos por ahora
  if (
    tecnologiaId !== "fotovoltaica_autoconsumo" &&
    tecnologiaId !== "climatizacion_aerotermia"
  ) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!municipio.trim() || !provincia.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    onResult?.(null);

    try {
      const res = await fetch("/api/orientacion/idoneidad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ municipio: municipio.trim(), provincia: provincia.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo calcular el índice para esta ubicación.");
      }

      const data = await res.json();
      setResult(data);
      onResult?.(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Error de conexión";
      setError(errorMessage);
      onResult?.(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="border-b border-border bg-bg px-5 py-4">
        <h2 className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <MapPin size={16} className="text-primary" />
          Índice de idoneidad geográfica
        </h2>
        <p className="mt-1 text-xs text-text-secondary">
          Descubre el potencial de esta tecnología en tu ubicación específica.
        </p>
      </div>

      <div className="p-5">
        <form onSubmit={handleSubmit} className="mb-5 grid gap-4 sm:grid-cols-2 items-end">
          <div className="space-y-1.5">
            <label htmlFor="municipio" className="text-xs font-medium text-text-primary">
              Municipio
            </label>
            <input
              id="municipio"
              type="text"
              required
              value={municipio}
              onChange={(e) => setMunicipio(e.target.value)}
              placeholder="Ej: Madrid"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <label htmlFor="provincia" className="text-xs font-medium text-text-primary">
                Provincia
              </label>
              <input
                id="provincia"
                type="text"
                required
                value={provincia}
                onChange={(e) => setProvincia(e.target.value)}
                placeholder="Ej: Madrid"
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !municipio.trim() || !provincia.trim()}
              className="inline-flex h-[38px] items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Calcular"}
            </button>
          </div>
        </form>

        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-danger/10 p-3 text-sm text-danger">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-4">
            {tecnologiaId === "fotovoltaica_autoconsumo" && (
              <div className="rounded-lg border border-primary/20 bg-primary-light/30 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Sun size={18} className="text-primary" />
                  <h3 className="font-medium text-text-primary">Potencial Solar (PVGIS)</h3>
                </div>
                {result.idoneidad.fotovoltaica_autoconsumo.disponible ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-text-secondary">Producción específica</p>
                      <p className="text-lg font-semibold text-text-primary">
                        {result.idoneidad.fotovoltaica_autoconsumo.produccion_especifica_kwh_kwp_year} <span className="text-sm font-normal text-text-secondary">kWh/kWp/año</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Clasificación</p>
                      <p className="text-lg font-semibold capitalize text-text-primary">
                        {result.idoneidad.fotovoltaica_autoconsumo.banda}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary">Datos de PVGIS no disponibles para esta ubicación.</p>
                )}
              </div>
            )}

            {tecnologiaId === "climatizacion_aerotermia" && (
              <div className="rounded-lg border border-primary/20 bg-primary-light/30 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Thermometer size={18} className="text-primary" />
                  <h3 className="font-medium text-text-primary">Severidad Climática (CTE)</h3>
                </div>
                {result.idoneidad.climatizacion_aerotermia.disponible ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-text-secondary">Zona Climática CTE</p>
                      <p className="text-lg font-semibold text-text-primary">
                        {result.idoneidad.climatizacion_aerotermia.zona_climatica}
                      </p>
                      {result.ubicacion.zona_climatica_aproximada && (
                        <p className="mt-0.5 text-[10px] text-text-secondary">
                          Aproximada a la altitud de la capital de provincia
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Potencial de ahorro</p>
                      <p className="text-sm font-medium capitalize text-text-primary mt-1">
                        {result.idoneidad.climatizacion_aerotermia.banda}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary">Datos climáticos CTE no disponibles.</p>
                )}
              </div>
            )}

            <div className="flex items-start gap-2 text-xs text-text-secondary">
              <Info size={14} className="mt-0.5 flex-shrink-0" />
              <p>{result.aviso}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
