"use client";

import { useEffect, useState } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { type FormState } from "./types";
import { BoolToggle, Field, InfoBanner } from "./FormPrimitives";

type EstadoAyuda = "vigente" | "agotado" | "en_ejecucion" | "cerrado" | "no_localizado";
type Fiabilidad = "oficial" | "secundaria" | "no_verificado";

interface AyudaCatalogo {
  id: string;
  comunidad: string | null;
  vertical: string;
  nombre: string;
  organismo: string;
  estado: EstadoAyuda;
  resumen_cuantia: string;
  requisitos: string;
  plazo: string;
  fuente_url: string;
  fiabilidad: Fiabilidad;
  fecha_consulta: string;
  notas: string;
}

interface SimulacionAyudas {
  comunidad: string;
  vertical: string;
  hay_alguna_vigente: boolean;
  aviso: string;
  ayudas: AyudaCatalogo[];
}

const ESTADO_ESTILO: Record<EstadoAyuda, { label: string; className: string }> = {
  vigente: { label: "Plazo abierto", className: "bg-success/10 text-success" },
  agotado: { label: "Fondos agotados", className: "bg-warning/10 text-warning" },
  en_ejecucion: { label: "Cerrado a nuevas solicitudes", className: "bg-warning/10 text-warning" },
  cerrado: { label: "Cerrado, sin sucesor", className: "bg-text-secondary/10 text-text-secondary" },
  no_localizado: { label: "No localizado", className: "bg-text-secondary/10 text-text-secondary" },
};

const FIABILIDAD_ETIQUETA: Record<Fiabilidad, string> = {
  oficial: "Fuente oficial",
  secundaria: "Fuente secundaria, sin verificar en boletín oficial",
  no_verificado: "Sin verificar",
};

export function Step3Ayudas() {
  const { control, watch } = useFormContext<FormState>();

  const tipoInstalacion = watch("tipo_instalacion");
  const comunidad = watch("comunidad");
  const solicitaAyuda = watch("solicita_ayuda");

  const [datos, setDatos] = useState<SimulacionAyudas | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tipoInstalacion || !comunidad) return;
    let cancelado = false;
    setCargando(true);
    setError(null);

    fetch(
      `/api/ayudas?comunidad=${encodeURIComponent(comunidad)}&tipo_instalacion=${encodeURIComponent(tipoInstalacion)}`
    )
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "No se pudo consultar el catálogo de ayudas");
        }
        return res.json();
      })
      .then((data: SimulacionAyudas) => {
        if (!cancelado) setDatos(data);
      })
      .catch((e: Error) => {
        if (!cancelado) setError(e.message);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [tipoInstalacion, comunidad]);

  const ayudas = datos?.ayudas ?? [];

  return (
    <div className="flex flex-col gap-5">
      {cargando && (
        <InfoBanner>Consultando el catálogo de ayudas públicas...</InfoBanner>
      )}

      {error && (
        <InfoBanner>
          No se ha podido consultar el catálogo de ayudas ahora mismo. Puedes continuar
          sin esta información: {error}
        </InfoBanner>
      )}

      {!cargando && !error && ayudas.length === 0 && (
        <InfoBanner>
          No hemos localizado ningún programa de ayuda pública (estatal o autonómico)
          para esta comunidad y tecnología en nuestra última investigación. Puede haber
          convocatorias municipales o provinciales no cubiertas. Se puede tramitar sin
          subvención.
        </InfoBanner>
      )}

      {!cargando && !error && ayudas.length > 0 && (
        <>
          {datos && <InfoBanner>{datos.aviso}</InfoBanner>}

          <div className="flex flex-col gap-3">
            {ayudas.map((ayuda) => {
              const estilo = ESTADO_ESTILO[ayuda.estado];
              return (
                <div
                  key={ayuda.id}
                  className="rounded-xl border border-border bg-surface p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-text-primary">{ayuda.nombre}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${estilo.className}`}
                    >
                      {estilo.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">{ayuda.organismo}</p>
                  <p className="mt-2 text-xs text-text-secondary leading-relaxed">
                    {ayuda.resumen_cuantia}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                    Plazo: {ayuda.plazo}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-text-secondary/80">
                    <span>{FIABILIDAD_ETIQUETA[ayuda.fiabilidad]}</span>
                    <span aria-hidden>·</span>
                    <a
                      href={ayuda.fuente_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-primary"
                    >
                      Ver fuente
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          <Controller
            control={control}
            name="solicita_ayuda"
            render={({ field, fieldState }) => (
              <Field
                label="¿Quieres incluir la tramitación de ayudas en el plan?"
                error={fieldState.error?.message}
                hint="Activar esta opción añadirá los trámites necesarios para solicitar la subvención al plan de tramitación."
              >
                <BoolToggle
                  value={field.value}
                  onChange={field.onChange}
                  labelTrue="Sí, incluir tramitación de ayudas"
                  labelFalse="No, solo la instalación"
                />
              </Field>
            )}
          />

          {solicitaAyuda && (
            <InfoBanner>
              Se añadirán los pasos de solicitud, documentación justificativa y
              plazos de resolución propios de cada programa al plan final. Verifica
              siempre el plazo y los requisitos en la fuente oficial antes de solicitar.
            </InfoBanner>
          )}
        </>
      )}
    </div>
  );
}
