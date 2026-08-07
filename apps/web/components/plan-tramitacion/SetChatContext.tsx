"use client";

import { useEffect } from "react";
import { useChatContextStore } from "@/store/use-chat-context-store";

/**
 * Publica el expediente activo en useChatContextStore para que ChatWidget
 * (montado una sola vez en el layout del dashboard) sepa en qué expediente
 * está el usuario. Sin esto, el asistente no tenía forma de enterarse
 * (mejoras 2026-08-07). No renderiza nada.
 */
export function SetChatContext({
  expedienteId,
  comunidad,
  tecnologia,
}: {
  expedienteId: string;
  comunidad: string;
  tecnologia: string;
}) {
  const setContext = useChatContextStore((s) => s.setContext);
  const clearContext = useChatContextStore((s) => s.clearContext);

  useEffect(() => {
    setContext({ expedienteId, comunidad, tecnologia });
    return () => clearContext();
  }, [expedienteId, comunidad, tecnologia, setContext, clearContext]);

  return null;
}
