import Link from "next/link";
import { Zap } from "lucide-react";

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Zap size={14} className="text-white" aria-hidden />
          </div>
          <span className="text-sm font-medium text-text-primary tracking-tight">
            PermitFlow{" "}
            <span className="rounded bg-primary-light px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              ES
            </span>
          </span>
        </Link>

        {/* Links */}
        <nav className="hidden items-center gap-6 md:flex" aria-label="Navegación principal">
          <Link href="#verticales" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
            Verticales
          </Link>
          <Link href="#cobertura" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
            Cobertura
          </Link>
          <Link href="#como-funciona" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
            Cómo funciona
          </Link>
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <Link
            href="/expedientes"
            className="hidden text-sm text-text-secondary hover:text-text-primary transition-colors md:block"
          >
            Acceder
          </Link>
          <Link
            href="/nueva-instalacion"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Clasificar instalación
          </Link>
        </div>
      </div>
    </header>
  );
}
