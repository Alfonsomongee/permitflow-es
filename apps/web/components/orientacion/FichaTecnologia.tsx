"use client";

import { useState } from "react";
import { Zap, Wind, Droplets, Flame, Car, ArrowLeft, CheckCircle2, XCircle, BookOpen, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { FichaTecnologia } from "@/content/tecnologias";
import { IndiceIdoneidad } from "./IndiceIdoneidad";
import type { IdoneidadResult } from "./IndiceIdoneidad";
import { SimuladorAhorro } from "./SimuladorAhorro";

const ICON_MAP: Record<FichaTecnologia["id"], LucideIcon> = {
  fotovoltaica_autoconsumo: Zap,
  irve: Car,
  climatizacion_aerotermia: Wind,
  acs: Droplets,
  gas_baja_presion: Flame,
};

type Props = {
  ficha: FichaTecnologia;
};

export function FichaTecnologia({ ficha }: Props) {
  const [resultIdoneidad, setResultIdoneidad] = useState<IdoneidadResult | null>(null);
  const Icon = ICON_MAP[ficha.id];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Navegación */}
      <Link
        href="/orientacion"
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft size={14} aria-hidden />
        Todas las tecnologías
      </Link>

      {/* Cabecera */}
      <div className="mb-8 flex items-start gap-4">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-light">
          <Icon size={22} className="text-primary" aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-medium tracking-tight text-text-primary">
            {ficha.nombre}
          </h1>
          <p className="mt-1 text-sm text-text-secondary leading-relaxed">
            {ficha.descripcionCorta}
          </p>
        </div>
      </div>

      {/* Qué es */}
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-text-primary">
          <BookOpen size={15} className="text-primary" aria-hidden />
          Qué es
        </h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          {ficha.queEs}
        </p>
      </section>

      {/* Para quién y cuándo no — lado a lado */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        {/* Para quién encaja */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-text-primary">
            <CheckCircle2 size={15} className="text-success" aria-hidden />
            Para quién encaja
          </h2>
          <ul className="flex flex-col gap-2">
            {ficha.paraQuienEncaja.map((item) => (
              <li
                key={item}
                className="flex gap-2 text-xs text-text-secondary leading-relaxed"
              >
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-success" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Cuándo NO encaja */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-text-primary">
            <XCircle size={15} className="text-danger" aria-hidden />
            Cuándo no encaja
          </h2>
          <ul className="flex flex-col gap-2">
            {ficha.cuandoNoEncaja.map((item) => (
              <li
                key={item}
                className="flex gap-2 text-xs text-text-secondary leading-relaxed"
              >
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-danger" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Contexto normativo y fiscal (mostrado para todas las tecnologías) */}
      <div className="mb-8">
        <IndiceIdoneidad 
          tecnologiaId={ficha.id} 
          onResult={setResultIdoneidad} 
        />
        
        {ficha.id === "fotovoltaica_autoconsumo" && resultIdoneidad && resultIdoneidad.idoneidad?.fotovoltaica_autoconsumo?.disponible && (
          <SimuladorAhorro result={resultIdoneidad} />
        )}
      </div>

      {/* Factor decisivo */}
      <section className="mb-8 rounded-xl border border-primary/20 bg-primary-light p-5">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-text-primary">
          <Target size={15} className="text-primary" aria-hidden />
          Factor decisivo
        </h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          {ficha.factorDecisivo}
        </p>
      </section>



      {/* CTA */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="mb-3 text-sm text-text-secondary">
          ¿Esta tecnología encaja con tu proyecto? Inicia la tramitación para
          obtener el plan de trámites específico de tu instalación.
        </p>
        <Link
          href={`/nueva-instalacion?tipo=${ficha.id}`}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          Iniciar tramitación
          <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
