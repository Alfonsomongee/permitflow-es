"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, RotateCw, ShieldCheck, XCircle } from "lucide-react";
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

  // Sin comprobaciones definidas para este vertical/comunidad: mejor no
  // renderizar nada que mostrar un panel Pro que confiesa estar vacío.
  if (!cargando && !error && !requiereUpgrade && resultado?.total_definidas === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          <ShieldCheck size={12} aria-hidden />
          Validación pre-presentación
        </p>
        <button
          onClick={() => void validar()}
          disabled={cargando}
          title="Volver a validar"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg hover:text-primary disabled:opacity-40"
        >
          {cargando ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <RotateCw size={14} aria-hidden />}
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

      {resultado && !cargando && (
        <>
          {resultado.total_definidas === 0 ? (
            <p className="text-xs text-text-secondary">Aún no hay comprobaciones definidas para este vertical y comunidad.</p>
          ) : resultado.hallazgos.length === 0 ? (
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
