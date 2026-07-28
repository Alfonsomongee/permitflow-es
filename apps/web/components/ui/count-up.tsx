"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  /** Valor final a mostrar */
  to: number;
  /** Valor inicial (default 0) */
  from?: number;
  /** Duración de la animación en ms (default 1500) */
  duration?: number;
  /** Prefijo (ej: "<") */
  prefix?: string;
  /** Sufijo (ej: "s", "%", " días") */
  suffix?: string;
  className?: string;
  /** Usa Intl.NumberFormat es-ES para formatear el número */
  format?: boolean;
}

function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4);
}

/**
 * Contador numérico animado con easing.
 * Se activa cuando el elemento entra en el viewport (IntersectionObserver).
 */
export function CountUp({
  to,
  from = 0,
  duration = 1500,
  prefix = "",
  suffix = "",
  className,
  format = false,
}: CountUpProps) {
  const [value, setValue] = useState(from);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Activa cuando entra en viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Anima el contador
  useEffect(() => {
    if (!started) return;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);
      const current = from + (to - from) * easedProgress;

      setValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setValue(to);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      startTimeRef.current = null;
    };
  }, [started, from, to, duration]);

  const display = format
    ? Math.round(value).toLocaleString("es-ES")
    : Number.isInteger(to)
    ? Math.round(value).toString()
    : value.toFixed(1);

  return (
    <span ref={ref} className={className}>
      {prefix}{display}{suffix}
    </span>
  );
}
