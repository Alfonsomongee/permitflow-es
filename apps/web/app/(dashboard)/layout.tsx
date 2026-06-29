/**
 * apps/web/app/(dashboard)/layout.tsx
 *
 * Layout raíz del área autenticada. Envuelve todas las rutas de (dashboard):
 * expedientes, nueva-instalacion, ajustes, etc.
 *
 * La sidebar es sticky y persiste entre navegaciones gracias al App Router.
 */

import { DashboardSidebar } from "@/components/layouts/DashboardSidebar";
import { DashboardTopbar } from "@/components/layouts/DashboardTopbar";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Sidebar fija */}
      <DashboardSidebar />

      {/* Área de contenido scrollable */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardTopbar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
