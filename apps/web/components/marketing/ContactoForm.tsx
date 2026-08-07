"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const contactoSchema = z.object({
  nombre: z.string().min(2, "Indica tu nombre."),
  email: z.string().email("Introduce un email válido."),
  telefono: z.string().optional(),
  empresa: z.string().optional(),
  mensaje: z.string().min(10, "Cuéntanos un poco más (mínimo 10 caracteres)."),
  // Honeypot: campo oculto para bots. Un humano nunca lo rellena.
  empresa_web: z.string().max(0, "").optional(),
});

type ContactoFormValues = z.infer<typeof contactoSchema>;

const TEXTAREA_CLASS = cn(
  "min-h-[120px] w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm text-text-primary shadow-xs",
  "transition-all duration-150 ease-smooth outline-none placeholder:text-muted-foreground",
  "hover:border-text-secondary/40 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15",
  "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15"
);

export function ContactoForm() {
  const searchParams = useSearchParams();
  const tipo = searchParams.get("tipo");
  const [enviado, setEnviado] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactoFormValues>({
    resolver: zodResolver(contactoSchema),
  });

  const onSubmit = async (data: ContactoFormValues) => {
    try {
      const response = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          tipo_instalacion: tipo || undefined,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || "No se pudo enviar el mensaje.");
      }

      setEnviado(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo enviar el mensaje.");
    }
  };

  if (enviado) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface p-8 text-center">
        <CheckCircle2 className="h-8 w-8 text-success" />
        <p className="font-medium text-text-primary">Mensaje enviado</p>
        <p className="text-sm text-text-secondary">
          Gracias por escribirnos. Te responderemos en breve.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {tipo && (
        <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-text-secondary">
          Consulta sobre: <strong>{tipo === "empresa" ? "instalación para empresa" : "comunidad de vecinos"}</strong>
        </p>
      )}

      <div className="grid gap-2">
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" aria-invalid={!!errors.nombre} {...register("nombre")} />
        {errors.nombre && <p className="text-sm text-destructive">{errors.nombre.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" aria-invalid={!!errors.email} {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="empresa">Empresa (opcional)</Label>
        <Input id="empresa" {...register("empresa")} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="telefono">Teléfono (opcional)</Label>
        <Input id="telefono" type="tel" {...register("telefono")} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="mensaje">Mensaje</Label>
        <textarea
          id="mensaje"
          className={TEXTAREA_CLASS}
          aria-invalid={!!errors.mensaje}
          {...register("mensaje")}
        />
        {errors.mensaje && <p className="text-sm text-destructive">{errors.mensaje.message}</p>}
      </div>

      {/* Honeypot anti-spam: oculto visualmente y del árbol de accesibilidad,
          nunca rellenado por un usuario real. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="empresa_web">No rellenar este campo</label>
        <input id="empresa_web" type="text" tabIndex={-1} autoComplete="off" {...register("empresa_web")} />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Enviar mensaje
      </Button>
    </form>
  );
}
