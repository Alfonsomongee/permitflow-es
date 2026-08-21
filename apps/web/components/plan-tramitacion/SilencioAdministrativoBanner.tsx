"use client";

import { useState } from "react";
import { ChevronDown, Scale } from "lucide-react";
import type { Tramite, TramitesEstadoMap } from "@/types/plan";
import { detectarSilenciosVencidos, mensajeSilencio } from "@/lib/silencioAdministrativo";

interface SilencioAdministrativoBannerProps {
  tramites: Tramite[];
  tramitesEstado: TramitesEstadoMap;
  comunidad: string;
}

/**
 * Origen: hoja de ruta de producto 2026-08-21 (PREM-06, prioridad #1). Un
 * plazo legal que vence sin respuesta del organismo no es solo "un plazo
 * más" -- según el trámite, la ley considera la solicitud estimada o
 * desestimada a partir de ese momento (art. 24 Ley 39/2015). Este banner
 * distingue eso de PlazosActivos (que solo cuenta días) y de
 * RiesgoNormativoBanner (que es un indicador cualitativo, no un hecho ya
 * ocurrido): aquí el plazo ya venció y hay una consecuencia legal concreta
 * que explicar.
 *
 * Solo se muestra para trámites con silencio_administrativo verificado a
 * mano en la regla de origen -- si ese campo no está informado, este
 * trámite simplemente no aparece aquí (no se afirma un efecto legal sin
 * haberlo verificado).
 */
export function SilencioAdministrativoBanner({
  tramites,
  tramitesEstado,
  comunidad,
}: SilencioAdministrativoBannerProps) {
  const [abierto, setAbierto] = useState(false);
  const silencios = detectarSilenciosVencidos(tramites, tramitesEstado, comunidad);

  if (silencios.length === 0) return null;

  const hayNoVerificados = silencios.some((s) => !s.calendarioVerificado);

  return (
    <div className="rounded-xl border border-danger/30 bg-danger-light px-4 py-3 text-xs text-danger-dark">
      <div className="flex items-start gap-2">
        <Scale size={14} className="mt-0.5 flex-shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {silencios.length === 1
              ? "1 trámite ha vencido en silencio administrativo"
              : `${silencios.length} trámites han vencido en silencio administrativo`}
          </p>
          <p className="mt-1 leading-relaxed">
            El plazo legal pasó sin respuesta del organismo. Esto tiene un efecto jurídico
            concreto, no es solo un retraso más.
          </p>
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            className="mt-2 flex items-center gap-1 font-medium underline-offset-2 hover:underline"
          >
            <ChevronDown
              size={12}
              className={`transition-transform ${abierto ? "rotate-180" : ""}`}
              aria-hidden
            />
            {abierto ? "Ocultar" : "Ver"} detalle y siguiente paso
          </button>
          {abierto && (
            <ul className="mt-2 space-y-3">
              {silencios.map((s) => (
                <li key={s.orden} className="leading-relaxed">
                  <p className="font-medium">
                    {s.orden}. {s.nombreTramite}{" "}
                    <span className="uppercase text-[10px] tracking-wide">
                      (silencio {s.efecto}, vencido hace {s.diasVencido} día
                      {s.diasVencido === 1 ? "" : "s"})
                    </span>
                  </p>
                  <p className="mt-0.5">{mensajeSilencio(s.efecto)}</p>
                  <p className="mt-0.5 text-[11px] text-danger-dark/80">
                    Base legal: {s.baseLegal} · Organismo: {s.organismo}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {abierto && hayNoVerificados && (
            <p className="mt-2 text-[11px] text-danger-dark/70">
              El calendario de días inhábiles de alguno de estos años no está cargado
              todavía: la fecha de vencimiento puede quedar, como mucho, 1-2 días hábiles
              optimista.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
