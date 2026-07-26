"use client";

import { Zap, Wind, Droplets, Flame, Car } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { FichaTecnologia } from "@/content/tecnologias";
import { TECNOLOGIAS } from "@/content/tecnologias";

const ICON_MAP: Record<FichaTecnologia["id"], LucideIcon> = {
  fotovoltaica_autoconsumo: Zap,
  irve: Car,
  climatizacion_aerotermia: Wind,
  acs: Droplets,
  gas_baja_presion: Flame,
};

export default function OrientacionPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* Cabecera */}
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-secondary">
        Orientación tecnológica
      </p>
      <h1 className="mb-2 text-2xl font-medium tracking-tight text-text-primary">
        ¿Qué tecnología encaja con tu proyecto?
      </h1>
      <p className="mb-8 max-w-xl text-sm text-text-secondary leading-relaxed">
        Consulta las fichas de cada tecnología para entender qué implica, a
        quién le encaja y cuándo no es la mejor opción. Sin compromiso, sin
        promesas de ahorro.
      </p>

      {/* Rejilla */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TECNOLOGIAS.map((tech) => {
          const Icon = ICON_MAP[tech.id];
          return (
            <Link
              key={tech.id}
              href={`/orientacion/${tech.id}`}
              className="group flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 transition-all hover:border-primary/30 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light transition-colors group-hover:bg-primary/15">
                  <Icon
                    size={18}
                    className="text-primary"
                    aria-hidden
                  />
                </div>
                <p className="text-sm font-medium text-text-primary">
                  {tech.nombre}
                </p>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                {tech.descripcionCorta}
              </p>
              <span className="mt-auto text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Ver ficha →
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
