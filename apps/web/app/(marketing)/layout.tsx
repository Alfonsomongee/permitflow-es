/**
 * apps/web/app/(marketing)/layout.tsx
 *
 * Layout para las páginas públicas (landing, precios, etc.).
 * No incluye la sidebar del dashboard.
 */
import type { ReactNode } from "react";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-surface">{children}</div>;
}
