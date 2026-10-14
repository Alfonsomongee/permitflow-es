"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface DuplicarExpedienteButtonProps {
  expedienteId: string;
}

/**
 * QW-07 (roadmap de mejoras): clona el expediente (mismo plan de
 * tramitación, progreso y cliente en blanco) y lleva directamente al
 * duplicado para que el usuario ajuste cliente/dirección. Sin confirmación
 * en dos pasos como el borrado: duplicar no es destructivo, y si sobra se
 * elimina con el mismo botón que ya existe para eso.
 */
export function DuplicarExpedienteButton({ expedienteId }: DuplicarExpedienteButtonProps) {
  const router = useRouter();
  const [duplicando, setDuplicando] = useState(false);

  const duplicar = async () => {
    setDuplicando(true);
    try {
      const res = await fetch(`/api/expedientes/${expedienteId}/duplicar`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error ?? `Error ${res.status}`);
      toast.success("Expediente duplicado. Actualiza el cliente y la dirección.");
      router.push(`/expedientes/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo duplicar el expediente.");
      setDuplicando(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={duplicar} disabled={duplicando}>
      {duplicando ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <Copy size={13} aria-hidden />}
      Duplicar
    </Button>
  );
}
