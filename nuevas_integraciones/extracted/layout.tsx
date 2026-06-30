/**
 * apps/web/app/layout.tsx
 *
 * Layout raíz con ClerkProvider para toda la app.
 * El ChatWidget sin contexto está disponible en todas las páginas.
 */
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import { ChatWidget } from "@/components/chat";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PermitFlow ES — Tramitación automática de instalaciones",
  description:
    "Clasifica cualquier instalación técnica y obtén el plan de tramitación exacto para tu comunidad autónoma.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider localization={esES}>
      <html lang="es">
        <body className={inter.className}>
          {children}
          {/* Bot flotante disponible en toda la app */}
          <ChatWidget />
        </body>
      </html>
    </ClerkProvider>
  );
}
