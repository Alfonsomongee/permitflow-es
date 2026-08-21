"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";

export function MarketingNav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
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

        {/* Links Desktop */}
        <nav className="hidden items-center gap-6 md:flex" aria-label="Navegación principal">
          <Link href="#quienes-somos" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
            Quiénes somos
          </Link>
          <Link href="#verticales" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
            Verticales
          </Link>
          <Link href="#cobertura" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
            Cobertura
          </Link>
          <Link href="#como-funciona" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
            Cómo funciona
          </Link>
          <Link href="#precios" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
            Precios
          </Link>
        </nav>

        {/* CTA Desktop */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/expedientes"
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Acceder
          </Link>
          <Link href="/nueva-instalacion" className={buttonVariants({ variant: "default" })}>
            Clasificar instalación
          </Link>
        </div>

        {/* Botón Menú Móvil */}
        <div className="flex items-center gap-4 md:hidden">
          <Link href="/nueva-instalacion" className={buttonVariants({ variant: "default", size: "sm" })}>
            Clasificar
          </Link>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-text-secondary hover:text-text-primary"
            aria-label="Alternar menú"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Menú Móvil Desplegable */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-surface md:hidden border-b border-border"
          >
            <nav className="flex flex-col px-6 py-4 gap-4">
              <Link href="#quienes-somos" onClick={() => setIsMenuOpen(false)} className="text-sm text-text-secondary hover:text-text-primary">
                Quiénes somos
              </Link>
              <Link href="#verticales" onClick={() => setIsMenuOpen(false)} className="text-sm text-text-secondary hover:text-text-primary">
                Verticales
              </Link>
              <Link href="#cobertura" onClick={() => setIsMenuOpen(false)} className="text-sm text-text-secondary hover:text-text-primary">
                Cobertura
              </Link>
              <Link href="#como-funciona" onClick={() => setIsMenuOpen(false)} className="text-sm text-text-secondary hover:text-text-primary">
                Cómo funciona
              </Link>
              <Link href="#precios" onClick={() => setIsMenuOpen(false)} className="text-sm text-text-secondary hover:text-text-primary">
                Precios
              </Link>
              <hr className="border-border" />
              <Link href="/expedientes" onClick={() => setIsMenuOpen(false)} className="text-sm font-medium text-text-primary">
                Acceder al dashboard
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
