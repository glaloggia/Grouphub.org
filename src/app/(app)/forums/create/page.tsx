
"use client";

import { PageShell } from "@/components/shared/PageShell";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import React, { useState, type FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { S_createForum } from "@/actions/forum-actions";
import { Skeleton } from "@/components/ui/skeleton";

export default function CreateForumPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, loading: authLoading } = useAuth();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace('/login?redirect=/forums/create');
    }
  }, [currentUser, authLoading, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast({ title: "Authentication required", description: "You must be logged in to create a forum.", variant: "destructive" });
      return;
    }
    if (!name.trim()) {
      setFormError("Forum name is required.");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);

    const result = await S_createForum({
      name,
      description,
      creatorId: currentUser.uid,
    });

    if (result.success) {
      toast({ title: "Forum Created!", description: `"${name}" has been successfully created.` });
      router.push("/forums");
    } else {
      setFormError(result.message || "An unknown error occurred.");
      toast({ title: "Error", description: result.message || "Failed to create forum.", variant: "destructive" });
    }

    setIsSubmitting(false);
  };

  if (authLoading || !currentUser) {
    return (
        <PageShell title="Create New Forum" description="Please log in to create a forum.">
             <Card className="w-full max-w-2xl mx-auto shadow-lg">
                <CardHeader>
                    <CardTitle>Redirecting...</CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-40 w-full" />
                </CardContent>
            </Card>
        </PageShell>
    );
  }

  return (
    <PageShell title="Create New Forum" description={`Start a new discussion area for the community.`}>
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>New Forum Details</CardTitle>
            <CardDescription>
              Give your new forum a name and a brief description.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="forumName">Forum Name</Label>
              <Input
                id="forumName"
                placeholder="e.g., General Discussion"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="forumDescription">Description</Label>
              <Textarea
                id="forumDescription"
                placeholder="What will this forum be about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" asChild type="button">
              <Link href="/forums">Cancel</Link>
            </Button>
            <Button type="submit" disabled={!currentUser || isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Forum"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </PageShell>
  );
}

    