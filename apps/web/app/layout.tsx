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

export const metadata: Metadata = {
  title: "PermitFlow — Tramitación de instalaciones técnicas",
  description:
    "Clasifica la instalación y obtén el plan de tramitación exacto para cada comunidad autónoma, con la base legal de cada trámite citada.",
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
