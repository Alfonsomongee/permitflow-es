"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

interface ExportPdfButtonProps {
  /** Nombre del expediente para el título de la ventana antes de imprimir */
  titulo?: string;
}

/**
 * Botón que genera un PDF del plan de tramitación usando window.print().
 * Los estilos de impresión están en app/print.css.
 *
 * Para una experiencia más controlada en producción, considera
 * Puppeteer en una API Route — ver comentario al final.
 */
export function ExportPdfButton({ titulo }: ExportPdfButtonProps) {
  const [printing, setPrinting] = useState(false);

  const handlePrint = () => {
    setPrinting(true);

    // Cambia el título del documento para que el PDF tenga un nombre útil
    const prevTitle = document.title;
    if (titulo) {
      document.title = `PermitFlow — ${titulo}`;
    }

    // Pequeño delay para que el estado se actualice antes del print dialog
    setTimeout(() => {
      window.print();
      document.title = prevTitle;
      setPrinting(false);
    }, 150);
  };

  return (
    <button
      onClick={handlePrint}
      disabled={printing}
      className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text-secondary hover:bg-bg transition-colors disabled:opacity-50"
    >
      {printing ? (
        <Loader2 size={13} className="animate-spin" aria-hidden />
      ) : (
        <Download size={13} aria-hidden />
      )}
      Exportar PDF
    </button>
  );
}

/*
 * ─── Alternativa server-side con Puppeteer (producción) ─────────────────────
 *
 * Si necesitas que el PDF se genere en el servidor (sin diálogo del navegador),
 * crea apps/web/app/api/pdf/[id]/route.ts:
 *
 * ```ts
 * import puppeteer from 'puppeteer';
 * import { auth } from '@clerk/nextjs/server';
 *
 * export async function GET(req, { params }) {
 *   const { userId, orgId } = await auth();
 *   if (!userId) return new Response('Unauthorized', { status: 401 });
 *
 *   const browser = await puppeteer.launch({ headless: true });
 *   const page = await browser.newPage();
 *   await page.goto(`${process.env.NEXT_PUBLIC_URL}/expedientes/${params.id}?print=1`);
 *   await page.waitForNetworkIdle();
 *   const pdf = await page.pdf({ format: 'A4', margin: { top: '20mm', bottom: '20mm' } });
 *   await browser.close();
 *
 *   return new Response(pdf, {
 *     headers: {
 *       'Content-Type': 'application/pdf',
 *       'Content-Disposition': `attachment; filename="permitflow-${params.id}.pdf"`,
 *     },
 *   });
 * }
 * ```
 *
 * Y en el botón: window.location.href = `/api/pdf/${expedienteId}`;
 * ──────────────────────────────────────────────────────────────────────────────
 */
