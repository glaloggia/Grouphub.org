"use client";

import { Logo } from "@/components/shared/Logo";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && currentUser) {
      router.replace('/dashboard');
    }
  }, [currentUser, loading, router]);

  if (loading || currentUser) {
    // Show a loading skeleton while we check auth status or while redirecting the user.
    // This prevents a flash of the login page for already-authenticated users.
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4">
        <Skeleton className="h-12 w-12 rounded-full mb-4" />
        <Skeleton className="h-4 w-[250px] mb-2" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    );
  }

  // If not loading and there's no user, show the children (login/signup page)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-transparent p-4">
      <div className="mb-8">
        <Logo size="lg" />
      </div>
      {children}
    </div>
  );
}
