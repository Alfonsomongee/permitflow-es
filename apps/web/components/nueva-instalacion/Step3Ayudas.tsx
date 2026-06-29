"use client";

import { type FormState } from "./types";
import { BoolToggle, Field, InfoBanner } from "./FormPrimitives";

interface Step3Props {
  state: FormState;
  onChange: (patch: Partial<FormState>) => void;
}

// Ayudas disponibles según el tipo de instalación
const AYUDAS_POR_TIPO: Record<
  string,
  { nombre: string; descripcion: string }[]
> = {
  irve: [
    {
      nombre: "MOVES III",
      descripcion:
        "Hasta 70% del coste de infraestructura para personas físicas. Gestionado por la CC. AA.",
    },
  ],
  fotovoltaica_autoconsumo: [
    {
      nombre: "Next Generation EU (PRTR)",
      descripcion:
        "Subvención directa de hasta el 40% para autoconsumo residencial en comunidades de vecinos.",
    },
    {
      nombre: "Deducciones IRPF",
      descripcion:
        "Deducción del 20% en cuota íntegra del IRPF por instalación de energía solar.",
    },
  ],
  climatizacion_aerotermia: [
    {
      nombre: "Plan RENOVE Calefacción",
      descripcion:
        "Ayuda para sustitución de sistemas de calefacción por aerotermia o bomba de calor.",
    },
  ],
  acs: [
    {
      nombre: "Plan RENOVE Calefacción",
      descripcion: "Aplica también para sistemas de ACS con bomba de calor.",
    },
  ],
  gas_baja_presion: [],
};

export function Step3Ayudas({ state, onChange }: Step3Props) {
  const ayudasDisponibles =
    AYUDAS_POR_TIPO[state.tipo_instalacion] ?? [];

  return (
    <div className="flex flex-col gap-5">
      {ayudasDisponibles.length === 0 ? (
        <InfoBanner>
          No hay programas de ayuda directamente asociados a este tipo de
          instalación en el motor actual. Se puede tramitar sin subvención.
        </InfoBanner>
      ) : (
        <>
          {/* Lista de ayudas disponibles */}
          <div className="flex flex-col gap-3">
            {ayudasDisponibles.map((ayuda) => (
              <div
                key={ayuda.nombre}
                className="rounded-xl border border-border bg-surface p-4"
              >
                <p className="text-sm font-medium text-text-primary">{ayuda.nombre}</p>
                <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                  {ayuda.descripcion}
                </p>
              </div>
            ))}
          </div>

          <Field
            label="¿Quieres incluir la tramitación de ayudas en el plan?"
            hint="Activar esta opción añadirá los trámites necesarios para solicitar la subvención al plan de tramitación."
          >
            <BoolToggle
              value={state.solicita_ayuda}
              onChange={(v) => onChange({ solicita_ayuda: v })}
              labelTrue="Sí, incluir tramitación de ayudas"
              labelFalse="No, solo la instalación"
            />
          </Field>

          {state.solicita_ayuda && (
            <InfoBanner>
              Se añadirán los pasos de solicitud, documentación justificativa y
              plazos de resolución propios de cada programa al plan final.
            </InfoBanner>
          )}
        </>
      )}
    </div>
  );
}
