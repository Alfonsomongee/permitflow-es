"use client";

import { useState } from "react";
import {
  Loader2,
  MapPin,
  AlertCircle,
  Info,
  Sun,
  Thermometer,
  Zap,
  Droplets,
  Flame,
} from "lucide-react";
import type { FichaTecnologia } from "@/content/tecnologias";
import { BloqueFiscal } from "@/components/orientacion/BloqueFiscal";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

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
      produccion_mensual_kwh?: number[];
      desviacion_estandar_mensual?: number[];
    };
    climatizacion_aerotermia: {
      disponible: boolean;
      zona_climatica?: string;
      banda?: string;
      descripcion_zona?: string;
      temperatura_media_mensual?: number[];
    };
  };
  aviso: string;
};

type Props = {
  tecnologiaId: FichaTecnologia["id"];
  onResult?: (result: IdoneidadResult | null) => void;
};

// Mini gráfico de barras SVG para producción mensual FV
function GraficoMensualFV({
  produccion,
  desviacion,
}: {
  produccion: number[];
  desviacion?: number[];
}) {
  const max = Math.max(...produccion);
  const barWidth = 14;
  const gap = 3;
  const height = 80;
  const totalWidth = (barWidth + gap) * 12 - gap;

  return (
    <div className="mt-3">
      <p className="mb-1.5 text-xs text-text-secondary">Producción estimada mensual (kWh/mes por kWp instalado)</p>
      <svg width={totalWidth} height={height + 20} viewBox={`0 0 ${totalWidth} ${height + 20}`} className="w-full">
        {produccion.map((val, i) => {
          const barH = max > 0 ? (val / max) * height : 0;
          const x = i * (barWidth + gap);
          const y = height - barH;
          const sd = desviacion?.[i] ?? 0;
          const sdH = max > 0 ? (sd / max) * height : 0;
          return (
            <g key={i}>
              {/* Barra principal */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={2}
                className="fill-primary/70"
              />
              {/* Banda de desviación (transparente) */}
              {sd > 0 && (
                <rect
                  x={x}
                  y={Math.max(0, y - sdH / 2)}
                  width={barWidth}
                  height={Math.min(sdH, height)}
                  rx={2}
                  className="fill-primary/20"
                />
              )}
              {/* Etiqueta de mes */}
              <text
                x={x + barWidth / 2}
                y={height + 14}
                textAnchor="middle"
                className="fill-text-secondary"
                fontSize={8}
              >
                {MESES[i]}
              </text>
            </g>
          );
        })}
      </svg>
      {desviacion && desviacion.some((d) => d > 0) && (
        <p className="mt-1 text-[10px] text-text-secondary">
          La zona sombreada indica la variabilidad climática interanual (SD mensual — pendiente de verificación con PVGIS).
        </p>
      )}
    </div>
  );
}

export function IndiceIdoneidad({ tecnologiaId, onResult }: Props) {
  const [municipio, setMunicipio] = useState("");
  const [provincia, setProvincia] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IdoneidadResult | null>(null);

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

  const iconoPorTecnologia: Record<FichaTecnologia["id"], React.ReactNode> = {
    fotovoltaica_autoconsumo: <Sun size={18} className="text-primary" />,
    climatizacion_aerotermia: <Thermometer size={18} className="text-primary" />,
    irve: <Zap size={18} className="text-primary" />,
    acs: <Droplets size={18} className="text-primary" />,
    gas_baja_presion: <Flame size={18} className="text-primary" />,
  };

  const tituloPorTecnologia: Record<FichaTecnologia["id"], string> = {
    fotovoltaica_autoconsumo: "Potencial Solar (PVGIS)",
    climatizacion_aerotermia: "Severidad Climática (CTE)",
    irve: "Contexto de IRVE",
    acs: "Normativa ACS",
    gas_baja_presion: "Gas Baja Presión",
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
              placeholder="Ej: Sevilla"
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
                placeholder="Ej: Sevilla"
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

            {/* --- FOTOVOLTAICA --- */}
            {tecnologiaId === "fotovoltaica_autoconsumo" && (
              <div className="rounded-lg border border-primary/20 bg-primary-light/30 p-4">
                <div className="mb-3 flex items-center gap-2">
                  {iconoPorTecnologia[tecnologiaId]}
                  <h3 className="font-medium text-text-primary">{tituloPorTecnologia[tecnologiaId]}</h3>
                </div>
                {result.idoneidad.fotovoltaica_autoconsumo.disponible ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-text-secondary">Producción específica</p>
                        <p className="text-lg font-semibold text-text-primary">
                          {result.idoneidad.fotovoltaica_autoconsumo.produccion_especifica_kwh_kwp_year}{" "}
                          <span className="text-sm font-normal text-text-secondary">kWh/kWp/año</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary">Clasificación</p>
                        <p className="text-lg font-semibold capitalize text-text-primary">
                          {result.idoneidad.fotovoltaica_autoconsumo.banda}
                        </p>
                      </div>
                    </div>
                    {result.idoneidad.fotovoltaica_autoconsumo.produccion_mensual_kwh &&
                      result.idoneidad.fotovoltaica_autoconsumo.produccion_mensual_kwh.length === 12 && (
                        <GraficoMensualFV
                          produccion={result.idoneidad.fotovoltaica_autoconsumo.produccion_mensual_kwh}
                          desviacion={result.idoneidad.fotovoltaica_autoconsumo.desviacion_estandar_mensual}
                        />
                      )}
                  </>
                ) : (
                  <p className="text-sm text-text-secondary">Datos de PVGIS no disponibles para esta ubicación.</p>
                )}
              </div>
            )}

            {/* --- AEROTERMIA --- */}
            {tecnologiaId === "climatizacion_aerotermia" && (
              <div className="rounded-lg border border-primary/20 bg-primary-light/30 p-4">
                <div className="mb-3 flex items-center gap-2">
                  {iconoPorTecnologia[tecnologiaId]}
                  <h3 className="font-medium text-text-primary">{tituloPorTecnologia[tecnologiaId]}</h3>
                </div>
                {result.idoneidad.climatizacion_aerotermia.disponible ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-text-secondary">Zona Climática CTE</p>
                        <p className="text-2xl font-bold text-primary">
                          {result.idoneidad.climatizacion_aerotermia.zona_climatica}
                        </p>
                        {result.ubicacion.zona_climatica_aproximada && (
                          <p className="mt-0.5 text-[10px] text-text-secondary">
                            Aproximada a la altitud de la capital de provincia
                          </p>
                        )}
                      </div>
                      {result.idoneidad.climatizacion_aerotermia.temperatura_media_mensual && (
                        <div>
                          <p className="text-xs text-text-secondary">Temperatura media anual</p>
                          <p className="text-lg font-semibold text-text-primary">
                            {(
                              result.idoneidad.climatizacion_aerotermia.temperatura_media_mensual.reduce(
                                (a, b) => a + b,
                                0
                              ) / 12
                            ).toFixed(1)}{" "}
                            <span className="text-sm font-normal text-text-secondary">°C</span>
                          </p>
                          <p className="text-[10px] text-text-secondary">Dato ERA5/ERA5-Land via PVGIS</p>
                        </div>
                      )}
                    </div>
                    {result.idoneidad.climatizacion_aerotermia.descripcion_zona && (
                      <div className="mt-3 rounded-md bg-bg p-3">
                        <p className="text-xs text-text-secondary">
                          {result.idoneidad.climatizacion_aerotermia.descripcion_zona}
                        </p>
                      </div>
                    )}
                    <div className="mt-2 flex items-start gap-1.5">
                      <Info size={12} className="mt-0.5 flex-shrink-0 text-text-secondary" />
                      <p className="text-[10px] text-text-secondary">
                        Los factores de ponderación SCOP (Tabla 4.1 IDAE) dependen de si el equipo es centralizado o split. Un SPF inferior a 2,5 implica que la instalación puede no ser considerada fuente renovable (Decisión CE 2013/114/UE), afectando a la elegibilidad para deducciones fiscales condicionadas.
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-text-secondary">Datos climáticos CTE no disponibles.</p>
                )}
              </div>
            )}

            {/* --- IRVE --- */}
            {tecnologiaId === "irve" && (
              <div className="rounded-lg border border-primary/20 bg-primary-light/30 p-4">
                <div className="mb-3 flex items-center gap-2">
                  {iconoPorTecnologia[tecnologiaId]}
                  <h3 className="font-medium text-text-primary">{tituloPorTecnologia[tecnologiaId]}</h3>
                </div>
                <p className="text-sm text-text-secondary">
                  Municipio: <strong className="text-text-primary">{municipio}</strong> ({result.ubicacion.comunidad})
                </p>
                <div className="mt-3 space-y-2 text-xs text-text-secondary">
                  <p>• Normativa aplicable: RD 1053/2014 (ITC-BT-52) + RD 184/2022 (acceso público).</p>
                  <p>• El Plan MOVES III está cerrado desde 31/12/2025. No existe un sucesor directo para subvención de infraestructura de recarga.</p>
                  <p>• El Programa Auto+ (RD 609/2026) cubre exclusivamente la compra del vehículo eléctrico, no la instalación del punto de recarga.</p>
                </div>
              </div>
            )}

            {/* --- ACS --- */}
            {tecnologiaId === "acs" && (
              <div className="rounded-lg border border-primary/20 bg-primary-light/30 p-4">
                <div className="mb-3 flex items-center gap-2">
                  {iconoPorTecnologia[tecnologiaId]}
                  <h3 className="font-medium text-text-primary">{tituloPorTecnologia[tecnologiaId]}</h3>
                </div>
                <p className="text-sm text-text-secondary">
                  Municipio: <strong className="text-text-primary">{municipio}</strong> ({result.ubicacion.comunidad})
                </p>
                <div className="mt-3 space-y-2 text-xs text-text-secondary">
                  <p>• <strong className="text-text-primary">CTE DB-HE4:</strong> Mínimo del 70% de la demanda de ACS debe cubrirse con energía renovable (60% si la demanda es inferior a 5.000 L/día).</p>
                  <p>• <strong className="text-text-primary">RD 487/2022 Legionella:</strong> Las instalaciones centralizadas de ACS con depósito acumulador están obligadas a disponer de un Plan de Prevención y Control de la Legionelosis.</p>
                  <p>• La aerotermia para ACS es compatible con el cumplimiento del CTE DB-HE4.</p>
                </div>
              </div>
            )}

            {/* --- GAS --- */}
            {tecnologiaId === "gas_baja_presion" && (
              <div className="rounded-lg border border-primary/20 bg-primary-light/30 p-4">
                <div className="mb-3 flex items-center gap-2">
                  {iconoPorTecnologia[tecnologiaId]}
                  <h3 className="font-medium text-text-primary">{tituloPorTecnologia[tecnologiaId]}</h3>
                </div>
                <p className="text-sm text-text-secondary">
                  Municipio: <strong className="text-text-primary">{municipio}</strong> ({result.ubicacion.comunidad})
                </p>
                <div className="mt-3 space-y-2 text-xs text-text-secondary">
                  <p>• Normativa: RD 919/2006 Reglamento Instalaciones de Gas + RD 984/2015.</p>
                  <p>• <strong className="text-text-primary">Revisión IRG-4 obligatoria cada 5 años.</strong> Es responsabilidad del titular de la instalación contratar la revisión con una empresa autorizada.</p>
                  <p>• Contexto de descarbonización: las calderas de gas de nueva instalación tendrán restricciones crecientes en edificios nuevos según la Directiva de Eficiencia Energética de Edificios (EPBD 2024).</p>
                </div>
              </div>
            )}

            {/* Bloque fiscal — para todas las tecnologías */}
            <BloqueFiscal
              comunidad={result.ubicacion.comunidad}
              tecnologiaId={tecnologiaId}
            />

            {/* Aviso legal */}
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
