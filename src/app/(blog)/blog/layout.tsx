"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { PwaInstallBanner } from "@/components/pwa/PwaInstallBanner";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  // This layout is intentionally simple. It uses the AppHeader for consistency
  // but does not enforce the authentication rules of the main AppLayout.
  return (
    <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex flex-col bg-transparent">
          <AppHeader />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
          <PwaInstallBanner />
        </SidebarInset>
    </SidebarProvider>
  );
}
