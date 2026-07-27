"use client";

import { Euro, Info, AlertCircle, CheckCircle } from "lucide-react";
import {
  deduccionesEstatalesRD19_2021,
  deduccionAutoconsumoRDL7_2026,
  deduccionIRVE_IRPF15,
  incentivosCAA,
} from "@/content/incentivos_ccaa";
import type { FichaTecnologia } from "@/content/tecnologias";

type Props = {
  comunidad: string; // slug de CCAA devuelto por la API
  tecnologiaId: FichaTecnologia["id"];
};

export function BloqueFiscal({ comunidad, tecnologiaId }: Props) {
  const data = incentivosCAA[comunidad];

  return (
    <div className="mt-4 space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
        <Euro size={16} className="text-primary" />
        Incentivos fiscales aplicables
      </h3>

      {/* Deducciones estatales rehabilitación (RD 19/2021) — siempre */}
      <div className="rounded-lg border border-border bg-bg p-3">
        <p className="text-xs font-medium text-text-primary">Deducciones estatales — Rehabilitación Energética</p>
        <p className="mt-0.5 text-[10px] text-text-secondary">{deduccionesEstatalesRD19_2021.base_legal}</p>
        <ul className="mt-2 space-y-1">
          {deduccionesEstatalesRD19_2021.deducciones.map((d) => (
            <li key={d.pct} className="flex items-start gap-1.5 text-xs text-text-secondary">
              <CheckCircle size={12} className="mt-0.5 flex-shrink-0 text-success" />
              <span>
                <strong className="text-text-primary">{d.pct}%</strong> — {d.descripcion}. Límite:{" "}
                {d.limite_eur.toLocaleString("es-ES")} €/año (hasta {d.vigente_hasta}).
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[10px] text-text-secondary">{deduccionesEstatalesRD19_2021.requisito}</p>
      </div>

      {/* Deducción autoconsumo RDL 7/2026 — solo FV */}
      {tecnologiaId === "fotovoltaica_autoconsumo" && (
        <div className="rounded-lg border border-primary/20 bg-primary-light/20 p-3">
          <p className="text-xs font-medium text-text-primary">
            Deducción Autoconsumo 2026
          </p>
          <p className="mt-0.5 text-[10px] text-text-secondary">{deduccionAutoconsumoRDL7_2026.base_legal}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-md bg-primary/5 p-2 text-center">
              <p className="text-lg font-bold text-primary">{deduccionAutoconsumoRDL7_2026.individual.pct}%</p>
              <p className="text-[10px] text-text-secondary">Instalación individual</p>
              <p className="text-[10px] text-text-secondary">
                base máx.{" "}
                {deduccionAutoconsumoRDL7_2026.individual.base_maxima_eur.toLocaleString("es-ES")} €/año
              </p>
            </div>
            <div className="rounded-md bg-primary/5 p-2 text-center">
              <p className="text-lg font-bold text-primary">{deduccionAutoconsumoRDL7_2026.edificio_residencial.pct}%</p>
              <p className="text-[10px] text-text-secondary">Edificio residencial</p>
              <p className="text-[10px] text-text-secondary">
                base máx.{" "}
                {deduccionAutoconsumoRDL7_2026.edificio_residencial.base_maxima_eur.toLocaleString("es-ES")} €/año
              </p>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-warning">
            ⚠️ Incluye baterías. Las modalidades 10% y 20% son incompatibles entre sí para la misma instalación. Vigencia: instalación finalizada en 2026.
          </p>
        </div>
      )}

      {/* Deducción IRPF 15% recarga — solo IRVE */}
      {tecnologiaId === "irve" && (
        <div className="rounded-lg border border-border bg-bg p-3">
          <p className="text-xs font-medium text-text-primary">Deducción IRPF 15% — Instalación Punto de Recarga</p>
          <p className="mt-0.5 text-[10px] text-text-secondary">{deduccionIRVE_IRPF15.base_legal}</p>
          <div className="mt-2 flex items-center gap-3">
            <div className="rounded-md bg-success/10 px-3 py-2 text-center">
              <p className="text-xl font-bold text-success">{deduccionIRVE_IRPF15.pct}%</p>
              <p className="text-[10px] text-text-secondary">IRPF</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-text-secondary">{deduccionIRVE_IRPF15.descripcion}</p>
              <p className="mt-1 text-xs text-text-secondary">
                Ahorro máximo en la parte de instalación:{" "}
                <strong className="text-text-primary">{deduccionIRVE_IRPF15.max_ahorro_recarga_eur} €</strong>
              </p>
            </div>
          </div>
          <div className="mt-2 flex items-start gap-1.5 rounded-md bg-warning/10 p-2">
            <Info size={12} className="mt-0.5 flex-shrink-0 text-warning" />
            <p className="text-[10px] text-text-secondary">{deduccionIRVE_IRPF15.nota}</p>
          </div>
        </div>
      )}

      {/* Deducción autonómica */}
      {data && (
        <div className="rounded-lg border border-border bg-bg p-3">
          <p className="text-xs font-medium text-text-primary">Deducción Autonómica IRPF</p>
          <p className="mt-0.5 text-[10px] text-text-secondary">Comunidad Autónoma de residencia</p>
          {data.nota_ui ? (
            <div className="mt-2 flex items-start gap-1.5">
              <AlertCircle size={12} className="mt-0.5 flex-shrink-0 text-warning" />
              <p className="text-xs text-text-secondary">{data.nota_ui}</p>
            </div>
          ) : data.deduccion_irpf_autonomica.existe ? (
            <>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xl font-bold text-primary">
                  {data.deduccion_irpf_autonomica.pct_max === data.deduccion_irpf_autonomica.pct_min
                    ? `${data.deduccion_irpf_autonomica.pct_max}%`
                    : `${data.deduccion_irpf_autonomica.pct_min}–${data.deduccion_irpf_autonomica.pct_max}%`}
                </span>
                {data.deduccion_irpf_autonomica.base_maxima_eur && (
                  <span className="text-xs text-text-secondary">
                    base máx. {data.deduccion_irpf_autonomica.base_maxima_eur.toLocaleString("es-ES")} €/año
                  </span>
                )}
              </div>
              {data.deduccion_irpf_autonomica.nota && (
                <p className="mt-1 text-[10px] text-text-secondary">{data.deduccion_irpf_autonomica.nota}</p>
              )}
              <p className="mt-1.5 text-[10px] italic text-text-secondary">
                Dato pendiente de verificación con fuente primaria.
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs text-text-secondary">No existe deducción autonómica específica en esta CCAA. Aplica únicamente la deducción estatal.</p>
          )}
        </div>
      )}

      {/* IBI e ICIO */}
      <div className="flex items-start gap-2 rounded-lg bg-bg p-3 text-xs text-text-secondary">
        <Info size={13} className="mt-0.5 flex-shrink-0 text-primary" />
        <p>
          <strong className="text-text-primary">IBI e ICIO:</strong> Muchos ayuntamientos aplican bonificaciones potestativas en el Impuesto de Bienes Inmuebles (hasta 50%) y en el Impuesto de Construcciones (hasta 95%) para instalaciones renovables. Consultá las ordenanzas fiscales de tu municipio.
        </p>
      </div>
    </div>
  );
}
