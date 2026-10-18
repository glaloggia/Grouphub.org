
"use client";

import { useState, type FormEvent, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { PageShell } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { S_createThread } from "@/actions/forum-actions";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export default function CreateThreadPage() {
    const params = useParams<{ forumId: string }>();
    const forumId = params.forumId;
    const router = useRouter();
    const { currentUser, loading: authLoading } = useAuth();
    const { toast } = useToast();

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !currentUser) {
            router.replace(`/login?redirect=/forums/${forumId}/create`);
        }
    }, [currentUser, authLoading, router, forumId]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!currentUser) {
            toast({ title: "Authentication required", description: "You must be logged in to create a thread.", variant: "destructive" });
            return;
        }
        if (!title.trim() || !content.trim()) {
            setFormError("Title and content are required.");
            return;
        }

        setIsSubmitting(true);
        setFormError(null);

        const result = await S_createThread({
            forumId,
            title,
            content,
            authorId: currentUser.uid,
            authorName: currentUser.displayName || "User",
            authorAvatar: currentUser.photoURL || undefined,
        });

        if (result.success && result.thread) {
            toast({ title: "Thread Created!", description: `Your thread "${title}" has been posted.` });
            router.push(`/forums/${forumId}/${result.thread.id}`);
        } else {
            setFormError(result.message || "An unknown error occurred.");
            toast({ title: "Error", description: result.message || "Failed to create thread.", variant: "destructive" });
        }

        setIsSubmitting(false);
    };

    if (authLoading || !currentUser) {
        return (
            <PageShell title="Create New Thread" description="Please log in to create a thread.">
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
        <PageShell title="Create New Thread" description={`Start a new discussion in this forum.`}>
            <Card className="w-full max-w-2xl mx-auto shadow-lg">
                <form onSubmit={handleSubmit}>
                    <CardHeader>
                        <CardTitle>New Thread</CardTitle>
                        <CardDescription>
                            Create a compelling title and write the first post for your new thread.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="threadTitle">Title</Label>
                            <Input
                                id="threadTitle"
                                placeholder="What's your thread about?"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                disabled={isSubmitting}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="threadContent">Content</Label>
                            <Textarea
                                id="threadContent"
                                placeholder="Share your thoughts..."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                disabled={isSubmitting}
                                required
                                rows={10}
                            />
                        </div>
                        {formError && <p className="text-sm text-destructive">{formError}</p>}
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button variant="outline" asChild type="button">
                            <Link href={`/forums/${forumId}`}>Cancel</Link>
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Posting..." : "Post Thread"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </PageShell>
    );
}
