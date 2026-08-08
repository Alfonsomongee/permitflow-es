"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Upload } from "lucide-react";
import { MAX_TAMANO_BYTES, MIME_PERMITIDOS } from "@/lib/documentos-cliente";

export interface DocumentoSubidoResumen {
  id: string;
  tramite_orden: number;
  documento_id: string;
  nombre_original: string;
  subido_en: string;
}

interface DocumentoUploadControlProps {
  token: string;
  tramiteOrden: number;
  documentoId: string;
  /** Ya subidos para este (tramite_orden, documento_id) concreto -- puede
   * haber más de uno si el cliente sube varias páginas/versiones. */
  subidos: DocumentoSubidoResumen[];
  onSubido: (doc: DocumentoSubidoResumen) => void;
}

/**
 * Control de subida para un documento requerido concreto dentro del portal
 * de cliente público (portal/[token]). Vive dentro de TramiteCard vía el
 * prop renderDocumentoExtra -- no se usa en el dashboard del instalador.
 */
export function DocumentoUploadControl({
  token,
  tramiteOrden,
  documentoId,
  subidos,
  onSubido,
}: DocumentoUploadControlProps) {
  const [estado, setEstado] = useState<"idle" | "subiendo" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const subir = async (file: File) => {
    setError(null);

    if (file.size > MAX_TAMANO_BYTES) {
      setEstado("error");
      setError("El archivo supera los 15MB permitidos.");
      return;
    }
    if (!MIME_PERMITIDOS.has(file.type)) {
      setEstado("error");
      setError("Formato no admitido. Solo PDF, JPG o PNG.");
      return;
    }

    setEstado("subiendo");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("tramite_orden", String(tramiteOrden));
      form.append("documento_id", documentoId);

      const res = await fetch(`/api/portal/${token}/documentos`, {
        method: "POST",
        body: form,
      });
      const data = (await res.json().catch(() => ({}))) as {
        documento?: DocumentoSubidoResumen;
        error?: string;
      };
      if (!res.ok || !data.documento) {
        throw new Error(data.error ?? `Error ${res.status}`);
      }
      onSubido(data.documento);
      setEstado("idle");
    } catch (err) {
      setEstado("error");
      setError(err instanceof Error ? err.message : "No se pudo subir el archivo.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-lg border border-dashed border-border bg-bg/60 p-2.5">
      {subidos.length > 0 && (
        <ul className="mb-2 space-y-1">
          {subidos.map((s) => (
            <li key={s.id} className="flex items-center gap-1.5 text-[11px] text-success-dark">
              <CheckCircle2 size={12} className="flex-shrink-0" aria-hidden />
              <span className="truncate">{s.nombre_original}</span>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        className="hidden"
        id={`subir-${tramiteOrden}-${documentoId}`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) subir(file);
        }}
      />
      <label
        htmlFor={`subir-${tramiteOrden}-${documentoId}`}
        className="flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-[11px] font-medium text-text-secondary transition-colors hover:border-primary hover:text-primary"
      >
        {estado === "subiendo" ? (
          <Loader2 size={12} className="animate-spin" aria-hidden />
        ) : (
          <Upload size={12} aria-hidden />
        )}
        {subidos.length > 0 ? "Subir otro archivo" : "Subir archivo (PDF, JPG o PNG · máx. 15MB)"}
      </label>

      {estado === "error" && error && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-danger">
          <AlertCircle size={11} className="flex-shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
