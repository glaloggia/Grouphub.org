"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PwaInstallBanner } from "@/components/pwa/PwaInstallBanner";
import { Footer } from "@/components/layout/Footer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicGroupPage = /^\/groups\/[^/]+$/.test(pathname);
  const isForumsPage = pathname.startsWith('/forums');
  const isEventsPage = pathname.startsWith('/events');

  useEffect(() => {
    // If it's a public group page, any forums page, or any events page, we don't force a redirect for logged-out users.
    if (isPublicGroupPage || isForumsPage || isEventsPage) {
      return;
    }

    // For all other pages in this layout, redirect to login if not authenticated.
    if (!loading && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, loading, router, pathname, isPublicGroupPage, isForumsPage, isEventsPage]);

  // Add a global error handler for ChunkLoadError
  useEffect(() => {
    const chunkErrorHandler = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      // This is a common pattern for Next.js chunk load errors
      if (error && (error.name === 'ChunkLoadError' || (error.message && (error.message.includes('Loading chunk') || error.message.includes('failed to fetch'))))) {
        console.warn('Caught a chunk loading error. Forcing a page reload to recover.');
        window.location.reload();
      }
    };

    window.addEventListener('unhandledrejection', chunkErrorHandler);

    return () => {
      window.removeEventListener('unhandledrejection', chunkErrorHandler);
    };
  }, []);


  // Loading state for all pages within this layout
  if (loading || (!isPublicGroupPage && !isForumsPage && !isEventsPage && !currentUser)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Skeleton className="h-12 w-12 rounded-full mb-4" />
        <Skeleton className="h-4 w-[250px] mb-2" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    );
  }
  
  // Render with the correct layout based on auth state
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex flex-col bg-transparent">
        <AppHeader />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
        <Footer />
        <PwaInstallBanner />
      </SidebarInset>
    </SidebarProvider>
  );
}
