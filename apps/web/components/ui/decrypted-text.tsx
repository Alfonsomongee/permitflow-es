"use client";

import { useEffect, useRef, useState } from "react";
import { FormattedMessage } from "@/components/chat/FormattedMessage";

interface TypewriterTextProps {
  text: string;
  /** Velocidad aproximada de aparición en ms (default ~15ms) */
  speed?: number;
  className?: string;
  /** Si false, muestra el texto de inmediato sin animación */
  animate?: boolean;
}

/**
 * Muestra el texto de forma progresiva con una cadencia limpia y natural (efecto escritura),
 * apareciendo letra a letra / palabra a palabra de forma normal, sin símbolos ni aleatorizaciones ("sin jeroglíficos").
 */
export function TypewriterText({
  text,
  speed = 15,
  className,
  animate = true,
}: TypewriterTextProps) {
  const [displayedLength, setDisplayedLength] = useState(animate ? 0 : text.length);
  const prevTextRef = useRef(text);

  useEffect(() => {
    if (!animate) {
      setDisplayedLength(text.length);
      return;
    }

    // Si el texto se está transmitiendo por streaming SSE (se añade contenido al final),
    // mostramos directamente lo nuevo sin reiniciar la animación
    if (text.startsWith(prevTextRef.current) && prevTextRef.current.length > 0) {
      prevTextRef.current = text;
      setDisplayedLength(text.length);
      return;
    }

    prevTextRef.current = text;
    setDisplayedLength(0);

    // Ajustar cadencia de aparición según la longitud del texto para un flujo cómodo y legible
    // Avanza entre 1 y 3 caracteres cada ~16ms para una animación constante y suave a 60fps
    const stepSize = Math.max(1, Math.ceil(text.length / 75));

    const timer = setInterval(() => {
      setDisplayedLength((current) => {
        const next = current + stepSize;
        if (next >= text.length) {
          clearInterval(timer);
          return text.length;
        }
        return next;
      });
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, animate]);

  const currentContent = text.slice(0, displayedLength);

  return (
    <FormattedMessage
      content={currentContent || text}
      className={className}
    />
  );
}

// Mantener alias DecryptedText para compatibilidad total con importaciones existentes
export const DecryptedText = TypewriterText;
