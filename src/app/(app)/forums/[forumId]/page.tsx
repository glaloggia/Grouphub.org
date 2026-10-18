
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { PageShell } from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, PlusCircle, MessageSquare, ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { Forum, ForumThread } from '@/types';
import { S_getForumById, S_getThreadsForForum, S_deleteThread } from '@/actions/forum-actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ForumPage() {
  const params = useParams<{ forumId: string }>();
  const forumId = params.forumId;
  const router = useRouter();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [forum, setForum] = useState<Forum | null>(null);
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeletingThread, setIsDeletingThread] = useState<string | null>(null);

  const fetchForumData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [forumData, threadsData] = await Promise.all([
        S_getForumById(forumId),
        S_getThreadsForForum(forumId)
      ]);

      if (!forumData) {
        setError("Forum not found.");
      } else {
        setForum(forumData);
        setThreads(threadsData);
      }
    } catch (e) {
      console.error("Failed to fetch forum data:", e);
      setError("Failed to load forum data.");
    } finally {
      setIsLoading(false);
    }
  }, [forumId]);

  useEffect(() => {
    fetchForumData();
  }, [fetchForumData]);

  const handleDeleteThread = async (threadId: string) => {
    if (!currentUser || !forum) return;
    setIsDeletingThread(threadId);
    const result = await S_deleteThread(forumId, threadId, currentUser.uid);
    if (result.success) {
        toast({ title: "Thread Deleted" });
        setThreads(prev => prev.filter(t => t.id !== threadId));
    } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
    }
    setIsDeletingThread(null);
  };

  const pageActions = (
    <>
      <Button variant="outline" size="sm" asChild>
        <Link href="/forums"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Forums</Link>
      </Button>
      {currentUser && (
        <Button asChild>
          <Link href={`/forums/${forumId}/create`}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Thread
          </Link>
        </Button>
      )}
    </>
  );

  if (isLoading) {
    return (
      <PageShell title="Loading Forum..." description="Please wait." actions={pageActions}>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  if (error || !forum) {
    return (
      <PageShell title="Error" description={error || "Could not load forum."} actions={pageActions}>
        <Card className="text-center py-10">
          <CardHeader>
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
            <CardTitle>Forum Not Found</CardTitle>
            <CardDescription>
              The forum you are looking for does not exist or has been moved.
            </CardDescription>
          </CardHeader>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title={forum.name} description={forum.description} actions={pageActions}>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60%]">Thread</TableHead>
                <TableHead className="text-center hidden md:table-cell">Replies</TableHead>
                <TableHead className="text-center hidden md:table-cell">Views</TableHead>
                <TableHead className="text-right">Last Post</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {threads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No threads have been started yet. Be the first!
                  </TableCell>
                </TableRow>
              ) : (
                threads.map(thread => (
                  <TableRow key={thread.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link href={`/forums/${forumId}/${thread.id}`} className="font-semibold text-primary hover:underline">
                          {thread.title}
                        </Link>
                        {currentUser && (currentUser.uid === thread.authorId || currentUser.uid === forum.creatorId) && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive h-7 w-7 hover:bg-destructive/10" disabled={isDeletingThread === thread.id}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Thread?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete the thread "{thread.title}" and all its replies. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteThread(thread.id)} className="bg-destructive hover:bg-destructive/90">
                                            Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">by {thread.authorName}</p>
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell">{thread.postCount - 1}</TableCell>
                    <TableCell className="text-center hidden md:table-cell">{thread.viewCount}</TableCell>
                    <TableCell className="text-right text-xs">
                      {thread.lastPost ? (
                        <div>
                          <p>by {thread.lastPost.authorName}</p>
                          <p className="text-muted-foreground">{formatDistanceToNow(new Date(thread.lastPost.postedAt), { addSuffix: true })}</p>
                        </div>
                      ) : (
                        "No replies yet"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}
