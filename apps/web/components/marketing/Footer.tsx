"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

// href: null = todavía no existe el destino (contenido/página pendiente).
// Se renderiza como texto "Próximamente" en vez de un enlace muerto (href="#")
// -- ver D-11 de la auditoría 2026-08-06. No se inventa contenido legal ni
// documentación que no existe: solo se deja de fingir que el enlace funciona.
const FOOTER_LINKS = {
  producto: [
    { name: "Quiénes somos", href: "#quienes-somos" },
    { name: "Motor Normativo", href: null },
    { name: "Precios", href: "#precios" },
    { name: "Cobertura Autonómica", href: "#cobertura" },
    { name: "Verticales", href: "#verticales" },
  ],
  recursos: [
    { name: "Documentación", href: null },
    { name: "API de Integración", href: null },
    { name: "Blog", href: null },
    { name: "Soporte", href: "/contacto" },
  ],
  legal: [
    { name: "Aviso Legal", href: null },
    { name: "Política de Privacidad", href: null },
    { name: "Términos de Servicio", href: null },
  ],
};

function FooterLink({ href, children }: { href: string | null; children: ReactNode }) {
  if (!href) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary/50">
        {children}
        <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] leading-none">
          Próximamente
        </span>
      </span>
    );
  }
  return (
    <Link href={href} className="text-sm text-text-secondary transition-colors hover:text-primary">
      {children}
    </Link>
  );
}

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
              <span className="text-sm font-medium text-text-primary">
                Recibe alertas del BOE <span className="text-text-secondary">(próximamente)</span>
              </span>
              {/* Sin backend de newsletter todavía: deshabilitado en vez de
                  simular un envío que no va a ningún sitio (ver D-11,
                  auditoría 2026-08-06). */}
              <form className="flex max-w-sm items-center gap-2" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="email"
                  placeholder="tu@email.com"
                  disabled
                  className="w-full cursor-not-allowed rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 opacity-60"
                />
                <button
                  type="submit"
                  disabled
                  className="inline-flex cursor-not-allowed items-center justify-center rounded-md bg-primary p-2 text-white opacity-60"
                  aria-label="Suscribirse (próximamente)"
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
                    <FooterLink href={link.href}>{link.name}</FooterLink>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-medium text-text-primary">Recursos</h3>
              <ul className="flex flex-col gap-3">
                {FOOTER_LINKS.recursos.map((link) => (
                  <li key={link.name}>
                    <FooterLink href={link.href}>{link.name}</FooterLink>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-medium text-text-primary">Legal</h3>
              <ul className="flex flex-col gap-3">
                {FOOTER_LINKS.legal.map((link) => (
                  <li key={link.name}>
                    <FooterLink href={link.href}>{link.name}</FooterLink>
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
