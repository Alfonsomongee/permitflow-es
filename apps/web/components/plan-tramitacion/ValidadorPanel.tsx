"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, RotateCw, XCircle } from "lucide-react";
import { SkeletonTexto } from "@/components/ui/skeleton";
import type { ValidacionResultado } from "@/types/plan";

interface ValidadorPanelProps {
  expedienteId: string;
}

export function ValidadorPanel({ expedienteId }: ValidadorPanelProps) {
  const [resultado, setResultado] = useState<ValidacionResultado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiereUpgrade, setRequiereUpgrade] = useState(false);

  const validar = useCallback(async () => {
    setCargando(true);
    setError(null);
    setRequiereUpgrade(false);
    try {
      const res = await fetch(`/api/expedientes/${expedienteId}/validar`);
      if (res.status === 402) {
        setRequiereUpgrade(true);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as ValidacionResultado | { error?: string };
      if (!res.ok) {
        throw new Error(("error" in data && data.error) || `Error ${res.status}`);
      }
      setResultado(data as ValidacionResultado);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo validar.");
    } finally {
      setCargando(false);
    }
  }, [expedienteId]);

  useEffect(() => {
    void validar();
  }, [validar]);

  // Antes, si no había comprobaciones definidas para esta comunidad y vertical,
  // el panel devolvía null y la pestaña "Validación" quedaba en blanco sin
  // explicación. Como eso ocurre en 60 de las 85 combinaciones (auditoría QA
  // 2026-08-11, A-05), el usuario podía interpretar el vacío como "todo
  // correcto". Se dice explícitamente que no hay nada que comprobar todavía.
  const sinComprobaciones =
    !cargando && !error && !requiereUpgrade && resultado?.total_definidas === 0;

  if (sinComprobaciones) {
    return (
      <div className="p-3">
        <p className="rounded-xl border border-border bg-muted px-3.5 py-3 text-xs leading-relaxed text-text-secondary">
          Todavía no hay comprobaciones previas definidas para esta comunidad y esta
          tecnología. Que no aparezca ninguna incidencia aquí{" "}
          <span className="font-medium text-text-primary">no significa que el expediente
          esté correcto</span>: significa que aún no hemos modelado qué revisar en este
          caso concreto.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="mb-3 flex justify-end">
        <button
          onClick={() => void validar()}
          disabled={cargando}
          title="Volver a validar"
          className="flex h-7 items-center justify-center gap-1.5 rounded-lg text-xs font-medium text-text-secondary transition-colors hover:text-primary disabled:opacity-40"
        >
          {cargando ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <RotateCw size={13} aria-hidden />}
          Re-validar
        </button>
      </div>

      {requiereUpgrade && (
        <p className="rounded-xl bg-warning-light px-3.5 py-2.5 text-xs text-warning-dark">
          El validador es una función del plan Pro.{" "}
          <Link href="/#precios" className="font-semibold underline">
            Ver planes
          </Link>
        </p>
      )}

      {error && <p className="text-xs text-danger-dark">{error}</p>}

      {/* Mientras valida, el cuerpo quedaba vacío y el resultado aparecía de
          golpe empujando el resto del panel. El skeleton reserva el hueco
          (auditoría UX/UI 2026-08-11, D-06). */}
      {cargando && !error && !requiereUpgrade && (
        <div className="rounded-xl border border-border px-3.5 py-3" aria-busy="true">
          <SkeletonTexto lineas={2} />
        </div>
      )}

      {resultado && !cargando && (
        <>
          {resultado.hallazgos.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl bg-success-light px-3.5 py-3 text-xs font-medium text-success-dark">
              <CheckCircle2 size={15} aria-hidden />
              Sin incidencias · {resultado.total_definidas} comprobaciones superadas
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {resultado.hallazgos.map((h) => (
                <li
                  key={h.id}
                  className={`rounded-xl px-3.5 py-3 text-xs leading-relaxed ${
                    h.severidad === "error" ? "bg-danger-light text-danger-dark" : "bg-warning-light text-warning-dark"
                  }`}
                >
                  <span className="mb-1 flex items-center gap-1.5 font-semibold">
                    {h.severidad === "error" ? <XCircle size={13} aria-hidden /> : <AlertTriangle size={13} aria-hidden />}
                    {h.severidad === "error" ? "Error" : "Aviso"}
                  </span>
                  {h.mensaje}
                  {h.fuente && <span className="mt-1.5 block text-[10px] italic opacity-80">Fuente: {h.fuente}</span>}
                </li>
              ))}
            </ul>
          )}
          {resultado.no_evaluables.length > 0 && (
            <p className="mt-2 text-[10px] text-text-secondary">
              {resultado.no_evaluables.length} comprobación(es) no evaluables — revisar JSON de normativa.
            </p>
          )}
        </>
      )}
    </div>
  );
}
