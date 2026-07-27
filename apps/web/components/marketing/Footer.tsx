"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

const FOOTER_LINKS = {
  producto: [
    { name: "Motor Normativo", href: "#" },
    { name: "Precios", href: "#precios" },
    { name: "Cobertura Autonómica", href: "#cobertura" },
    { name: "Verticales", href: "#verticales" },
  ],
  recursos: [
    { name: "Documentación", href: "#" },
    { name: "API de Integración", href: "#" },
    { name: "Blog", href: "#" },
    { name: "Soporte", href: "#" },
  ],
  legal: [
    { name: "Aviso Legal", href: "#" },
    { name: "Política de Privacidad", href: "#" },
    { name: "Términos de Servicio", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface pt-16 pb-8">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 lg:grid-cols-5 lg:gap-8">
          
          {/* Brand & Newsletter */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <span className="text-xl font-medium tracking-tight text-text-primary">
                PermitFlow<span className="text-primary">ES</span>
              </span>
            </div>
            <p className="mb-6 max-w-sm text-sm text-text-secondary leading-relaxed">
              El SaaS B2B que simplifica la clasificación de trámites
              administrativos para instalaciones técnicas en España.
            </p>
            
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-text-primary">Recibe alertas del BOE</span>
              <form className="flex max-w-sm items-center gap-2" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="email"
                  placeholder="tu@email.com"
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-md bg-primary p-2 text-white transition-opacity hover:opacity-90"
                  aria-label="Suscribirse"
                >
                  <ArrowRight size={16} />
                </button>
              </form>
            </div>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-3">
            <div>
              <h3 className="mb-4 text-sm font-medium text-text-primary">Producto</h3>
              <ul className="flex flex-col gap-3">
                {FOOTER_LINKS.producto.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href} className="text-sm text-text-secondary transition-colors hover:text-primary">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-medium text-text-primary">Recursos</h3>
              <ul className="flex flex-col gap-3">
                {FOOTER_LINKS.recursos.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href} className="text-sm text-text-secondary transition-colors hover:text-primary">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-medium text-text-primary">Legal</h3>
              <ul className="flex flex-col gap-3">
                {FOOTER_LINKS.legal.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href} className="text-sm text-text-secondary transition-colors hover:text-primary">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-text-secondary">
            © {new Date().getFullYear()} PermitFlow ES — Prototipo SaaS. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4 text-xs text-text-secondary">
            <span>Motor normativo v1.0</span>
            <span className="h-1 w-1 rounded-full bg-border" aria-hidden />
            <span className="flex items-center gap-1.5 text-success">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success"></span>
              </span>
              Sistemas operativos
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
