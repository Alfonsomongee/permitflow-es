"use client";

import { useEffect, useRef, useState } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&";

interface DecryptedTextProps {
  text: string;
  /** Duración total de la animación en ms (default 1200) */
  duration?: number;
  /** Delay inicial en ms antes de empezar (default 0) */
  delay?: number;
  className?: string;
  /** Si false, omite la animación y muestra el texto directamente */
  animate?: boolean;
}

/**
 * Muestra el texto con efecto de "descifrado" — los caracteres aleatorizan
 * durante un momento antes de fijarse en su valor final.
 * Ideal para respuestas del asistente IA.
 */
export function DecryptedText({
  text,
  duration = 1200,
  delay = 0,
  className,
  animate = true,
}: DecryptedTextProps) {
  const [displayed, setDisplayed] = useState(animate ? "" : text);
  const frameRef = useRef<NodeJS.Timeout | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!animate) {
      setDisplayed(text);
      return;
    }

    // Espera el delay inicial
    const delayTimer = setTimeout(() => {
      const totalChars = text.length;

      const tick = () => {
        const now = Date.now();
        if (startRef.current === null) startRef.current = now;
        const elapsed = now - startRef.current;
        const progress = Math.min(elapsed / duration, 1);

        // Cuántos caracteres ya están "fijados"
        const fixed = Math.floor(progress * totalChars);

        let result = "";
        for (let i = 0; i < totalChars; i++) {
          if (text[i] === " " || text[i] === "\n") {
            result += text[i];
          } else if (i < fixed) {
            result += text[i];
          } else {
            result += CHARS[Math.floor(Math.random() * CHARS.length)];
          }
        }

        setDisplayed(result);

        if (progress < 1) {
          frameRef.current = setTimeout(tick, 40);
        } else {
          setDisplayed(text);
        }
      };

      tick();
    }, delay);

    return () => {
      clearTimeout(delayTimer);
      if (frameRef.current) clearTimeout(frameRef.current);
      startRef.current = null;
    };
  }, [text, duration, delay, animate]);

  return (
    <span className={className} aria-label={text}>
      {displayed || "\u00A0"}
    </span>
  );
}
