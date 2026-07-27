"use client";

import { useState, useEffect, useRef } from "react";

export function useCounterAnimation(target: number, duration = 1500): number {
  const [count, setCount] = useState(0);
  const startTimestamp = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    startTimestamp.current = null;

    const step = (timestamp: number) => {
      if (!startTimestamp.current) startTimestamp.current = timestamp;
      const elapsed = timestamp - startTimestamp.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cúbico: rápido al inicio, frena al final
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return count;
}
