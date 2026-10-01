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
import { SidebarProvider } from "@/components/layouts/SidebarContext";
import { ChatWidgetLazy } from "@/components/chat/ChatWidgetLazy";
import { CommandPalette } from "@/components/layouts/CommandPalette";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-bg">
        {/* Sidebar */}
        <DashboardSidebar />

        <div className="flex flex-1 flex-col overflow-hidden w-full">
          <DashboardTopbar />
          <main id="main-content" className="flex-1 overflow-y-auto w-full relative">
            {children}
          </main>
        </div>

        <ChatWidgetLazy />
        <CommandPalette />
      </div>
    </SidebarProvider>
  );
}
