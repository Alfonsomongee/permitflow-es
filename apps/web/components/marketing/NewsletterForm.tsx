"use client";

import { useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { capturar } from "@/lib/analytics/posthog";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [empresaWeb, setEmpresaWeb] = useState(""); // honeypot
  const [acepto, setAcepto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [suscrito, setSuscrito] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(email)) {
      toast.error("Introduce un email válido.");
      return;
    }

    if (!acepto) {
      toast.error("Acepta la política de privacidad para suscribirte.");
      return;
    }

    setEnviando(true);
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, empresa_web: empresaWeb || undefined }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || "No se pudo completar la suscripción.");
      }

      capturar("newsletter_suscrito");
      setSuscrito(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo completar la suscripción.");
    } finally {
      setEnviando(false);
    }
  };

  if (suscrito) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-success">
        <Check size={16} aria-hidden />
        Suscrito. Te avisaremos por email.
      </p>
    );
  }

  return (
    <form className="flex max-w-sm flex-col gap-2" onSubmit={onSubmit} noValidate>
      <div className="flex items-center gap-2">
        <input
          type="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={enviando}
          required
          aria-label="Email para alertas del BOE"
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary transition-colors focus:border-primary focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={enviando}
          aria-label="Suscribirse a las alertas del BOE"
          className="inline-flex items-center justify-center rounded-md bg-primary p-2 text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enviando ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <ArrowRight size={16} aria-hidden />}
        </button>
      </div>
      <label className="flex items-start gap-2 text-xs text-text-secondary">
        <input
          type="checkbox"
          checked={acepto}
          onChange={(e) => setAcepto(e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 rounded border-border accent-primary"
        />
        <span>
          Acepto recibir alertas del BOE por correo y la{" "}
          <Link href="/privacidad" className="text-primary underline underline-offset-2">
            política de privacidad
          </Link>
          .
        </span>
      </label>
      {/* Honeypot anti-spam: oculto visualmente y del árbol de accesibilidad. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="footer_empresa_web">No rellenar este campo</label>
        <input
          id="footer_empresa_web"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={empresaWeb}
          onChange={(e) => setEmpresaWeb(e.target.value)}
        />
      </div>
    </form>
  );
}
