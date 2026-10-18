
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { PageShell } from "@/components/shared/PageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function ProfileRedirectPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      if (currentUser) {
        router.replace(`/profile/${currentUser.uid}`);
      } else {
        // If not logged in (AppLayout should handle this, but as a fallback)
        router.replace('/login');
      }
    }
  }, [currentUser, authLoading, router]);

  // Display a loading state while redirecting
  return (
    <PageShell title="Loading Profile..." description="Please wait while we redirect you.">
      <Card className="shadow-xl">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
              <Skeleton className="h-24 w-24 md:h-32 md:w-32 rounded-full" />
              <div className="space-y-2 text-center md:text-left">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
          </CardContent>
        </Card>
    </PageShell>
  );
}
