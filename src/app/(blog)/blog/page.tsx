
"use client";

import { PageShell } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function BlogListPage() {
    return (
        <PageShell title="Blog Removed" description="This feature is no longer available.">
            <Button asChild variant="outline">
                <Link href="/dashboard">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Go to Dashboard
                </Link>
            </Button>
        </PageShell>
    );
}
