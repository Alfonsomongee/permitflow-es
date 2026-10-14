"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] error no controlado:", error);
  }, [error]);

  return (
    <main id="main-content" role="alert" className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-medium text-text-primary">Algo no ha ido bien</h1>
      <p className="max-w-md text-sm text-text-secondary">
        No hemos podido cargar esta pantalla. Tus datos no se han perdido. Inténtalo de nuevo y, si el problema continúa,
        escríbenos desde la página de contacto.
      </p>
      {error.digest && <p className="text-xs text-text-secondary">Referencia: {error.digest}</p>}
      <Button onClick={reset}>Reintentar</Button>
    </main>
  );
}
