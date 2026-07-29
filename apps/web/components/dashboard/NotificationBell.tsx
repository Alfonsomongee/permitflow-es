"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Clock, AlertTriangle } from "lucide-react";

interface Notificacion {
  id: string;
  expediente_id: string;
  tramite_orden: number;
  tipo: "plazo_proximo" | "plazo_vencido";
  dias_restantes: number;
  mensaje: string;
  leida: boolean;
  creado_en: string;
}

/**
 * Campana de notificaciones real, conectada a /api/notificaciones (generadas
 * por el cron de plazos). Antes este botón existía en DashboardTopbar con un
 * punto rojo fijo en el JSX: se mostraba siempre, sin relación con ningún
 * dato — puramente decorativo.
 */
export function NotificationBell() {
  const [abierto, setAbierto] = useState(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  const cargar = async () => {
    try {
      const res = await fetch("/api/notificaciones");
      if (!res.ok) return;
      const data = (await res.json()) as { notificaciones: Notificacion[]; noLeidas: number };
      setNotificaciones(data.notificaciones ?? []);
      setNoLeidas(data.noLeidas ?? 0);
    } catch {
      // Silencioso: la campana simplemente no muestra novedades si falla la red.
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, 60_000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, []);

  const marcarLeida = async (id: string) => {
    setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    setNoLeidas((n) => Math.max(0, n - 1));
    await fetch("/api/notificaciones/leer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  };

  const marcarTodasLeidas = async () => {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    setNoLeidas(0);
    await fetch("/api/notificaciones/leer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ todas: true }),
    }).catch(() => {});
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAbierto((v) => !v)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary hover:bg-bg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Notificaciones"
      >
        <Bell size={15} aria-hidden />
        {!cargando && noLeidas > 0 && (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-danger ring-2 ring-surface" aria-hidden />
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
            <p className="text-xs font-semibold text-text-primary">
              Plazos {noLeidas > 0 && `(${noLeidas} sin leer)`}
            </p>
            {noLeidas > 0 && (
              <button
                onClick={marcarTodasLeidas}
                className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-primary"
              >
                <CheckCheck size={12} aria-hidden />
                Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notificaciones.length === 0 ? (
              <p className="px-3.5 py-6 text-center text-xs text-text-secondary">
                {cargando ? "Cargando…" : "Sin plazos próximos ni vencidos."}
              </p>
            ) : (
              notificaciones.map((n) => (
                <Link
                  key={n.id}
                  href={`/expedientes/${n.expediente_id}`}
                  onClick={() => !n.leida && marcarLeida(n.id)}
                  className={`flex items-start gap-2.5 border-b border-border px-3.5 py-2.5 text-xs transition-colors last:border-b-0 hover:bg-bg ${
                    n.leida ? "opacity-60" : ""
                  }`}
                >
                  {n.tipo === "plazo_vencido" ? (
                    <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-danger" aria-hidden />
                  ) : (
                    <Clock size={14} className="mt-0.5 flex-shrink-0 text-warning" aria-hidden />
                  )}
                  <span className="leading-relaxed text-text-primary">{n.mensaje}</span>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
