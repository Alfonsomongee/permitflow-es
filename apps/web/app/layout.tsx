import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { ChatWidget } from "@/components/chat";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PermitFlow ES",
  description: "Clasificación automática de trámites administrativos para instalaciones técnicas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
