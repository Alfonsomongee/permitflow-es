"use client";

import { useState, useMemo } from "react";
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Building2,
  ExternalLink,
  Search,
} from "lucide-react";
import {
  catalogoPlantillas,
  TIPOS_INSTALACION_LABELS,
} from "@/content/plantillas";
import type { TipoInstalacion, Organismo } from "@/content/plantillas";

const FILTROS_TECNOLOGIA: { id: TipoInstalacion | "todas"; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "fotovoltaica_autoconsumo", label: "Fotovoltaica" },
  { id: "infraestructura_recarga", label: "IRVE" },
  { id: "climatizacion_aerotermia", label: "Aerotermia" },
  { id: "acs_agua_caliente", label: "ACS" },
  { id: "gas_baja_presion", label: "Gas" },
];

const ORGANISMO_COLORES: Record<Organismo, string> = {
  distribuidora: "bg-primary/10 text-primary",
  ccaa_industria: "bg-warning/10 text-warning",
  miteco: "bg-primary/10 text-primary",
  ayuntamiento: "bg-success/10 text-success",
  comunidad_propietarios: "bg-border text-text-secondary",
  empresa_autorizada: "bg-danger/10 text-danger",
  idae: "bg-primary/10 text-primary",
};

const TECNOLOGIA_COLORES: Record<TipoInstalacion, string> = {
  fotovoltaica_autoconsumo: "bg-warning/10 text-warning",
  infraestructura_recarga: "bg-primary/10 text-primary",
  climatizacion_aerotermia: "bg-success/10 text-success",
  acs_agua_caliente: "bg-primary/10 text-primary",
  gas_baja_presion: "bg-border text-text-secondary",
};

export default function PlantillasPage() {
  const [filtroTecnologia, setFiltroTecnologia] = useState<TipoInstalacion | "todas">("todas");
  const [busqueda, setBusqueda] = useState("");

  const plantillasFiltradas = useMemo(() => {
    return catalogoPlantillas.filter((p) => {
      const matchTecnologia =
        filtroTecnologia === "todas" || p.tipos_instalacion.includes(filtroTecnologia);
      const matchBusqueda =
        busqueda.trim() === "" ||
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.base_legal.toLowerCase().includes(busqueda.toLowerCase());
      return matchTecnologia && matchBusqueda;
    });
  }, [filtroTecnologia, busqueda]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Catálogo de Plantillas</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Documentos técnicos y administrativos necesarios por tipo de instalación.
        </p>
      </div>

      {/* Controles de filtrado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Buscar documento, base legal..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-md border border-border bg-bg py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTROS_TECNOLOGIA.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltroTecnologia(f.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filtroTecnologia === f.id
                  ? "bg-primary text-white"
                  : "bg-bg border border-border text-text-secondary hover:bg-surface"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contador */}
      <p className="text-xs text-text-secondary">
        {plantillasFiltradas.length} documento{plantillasFiltradas.length !== 1 ? "s" : ""} encontrado{plantillasFiltradas.length !== 1 ? "s" : ""}
      </p>

      {/* Grid de tarjetas */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {plantillasFiltradas.map((plantilla) => (
          <div
            key={plantilla.id}
            className="flex flex-col rounded-xl border border-border bg-surface p-5 transition hover:border-primary/30"
          >
            {/* Header */}
            <div className="mb-3 flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <FileText size={16} className="text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold leading-tight text-text-primary">{plantilla.nombre}</h3>
                <p className="mt-0.5 text-[10px] text-text-secondary">{plantilla.base_legal}</p>
              </div>
            </div>

            {/* Descripción */}
            <p className="mb-3 flex-1 text-xs text-text-secondary">{plantilla.descripcion}</p>

            {/* Tecnologías */}
            <div className="mb-3 flex flex-wrap gap-1">
              {plantilla.tipos_instalacion.map((tipo) => (
                <span
                  key={tipo}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TECNOLOGIA_COLORES[tipo]}`}
                >
                  {TIPOS_INSTALACION_LABELS[tipo]}
                </span>
              ))}
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ORGANISMO_COLORES[plantilla.organismo]}`}
              >
                <Building2 className="mr-1 inline-block" size={8} />
                {plantilla.organismo_label}
              </span>
            </div>

            {/* Cuándo */}
            <div className="mb-3 rounded-md bg-bg p-2">
              <p className="text-[10px] font-medium text-text-secondary">¿Cuándo?  
                <span className="font-normal">{plantilla.cuando_se_necesita}</span>
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {plantilla.hay_formulario_oficial ? (
                  <>
                    <CheckCircle size={12} className="text-success" />
                    <span className="text-[10px] text-success">Formulario oficial disponible</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={12} className="text-warning" />
                    <span className="text-[10px] text-text-secondary">Modelo por CCAA</span>
                  </>
                )}
              </div>
              {plantilla.url_organismo && (
                <a
                  href={plantilla.url_organismo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                >
                  Ver organismo <ExternalLink size={9} />
                </a>
              )}
            </div>

            {plantilla.notas && (
              <p className="mt-2 text-[10px] italic text-text-secondary">{plantilla.notas}</p>
            )}
          </div>
        ))}
      </div>

      {plantillasFiltradas.length === 0 && (
        <div className="rounded-xl border border-border py-16 text-center">
          <FileText size={32} className="mx-auto mb-3 text-text-secondary opacity-40" />
          <p className="text-sm text-text-secondary">No hay documentos que coincidan con los filtros aplicados.</p>
        </div>
      )}
    </div>
  );
}
