import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import { Toaster } from "@/components/ui/sonner";
import { PostHogProvider } from "@/components/analytics/PostHogProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const SITE_URL = process.env.NEXT_PUBLIC_URL ?? "http://localhost:3007";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PermitFlow — Tramitación de instalaciones técnicas",
    template: "%s",
  },
  description:
    "Clasifica la instalación y obtén el plan de tramitación para cada comunidad autónoma, con la base legal de cada trámite y el nivel de verificación de la normativa a la vista.",
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "PermitFlow ES",
    title: "PermitFlow — Tramitación de instalaciones técnicas",
    description:
      "Plan de tramitación por comunidad autónoma para fotovoltaica, recarga de vehículo eléctrico, climatización, ACS y gas.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
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
          <PostHogProvider>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:bg-primary focus:px-4 focus:py-2 focus:text-white focus:outline-none"
            >
              Saltar al contenido principal
            </a>
            {children}
            <Toaster position="bottom-right" />
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
