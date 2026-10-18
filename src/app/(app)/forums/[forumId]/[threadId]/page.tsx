
"use client";

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { PageShell } from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowLeft, MessageSquare, Send, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { Forum, ForumThread, ForumPost } from '@/types';
import { S_getForumById, S_getThreadById, S_getPostsForThread, S_createPost, S_deletePost } from '@/actions/forum-actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import ReactMarkdown from 'react-markdown';
import { useToast } from '@/hooks/use-toast';
import { TimeAgo } from '@/components/shared/TimeAgo';
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
import { dispatchStorageUpdatedEvent } from "@/hooks/useNotificationData";

const THREAD_LAST_READ_PREFIX = "forum_thread_last_read_";

export default function ThreadPage() {
  const params = useParams<{ forumId: string, threadId: string }>();
  const { forumId, threadId } = params;
  const router = useRouter();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [forum, setForum] = useState<Forum | null>(null);
  const [thread, setThread] = useState<ForumThread | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState<string | null>(null);
  
  const [replyContent, setReplyContent] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const fetchThreadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [forumData, threadData, postsData] = await Promise.all([
        S_getForumById(forumId),
        S_getThreadById(forumId, threadId),
        S_getPostsForThread(forumId, threadId)
      ]);

      if (!threadData) {
        setError("Thread not found.");
      } else {
        setForum(forumData);
        setThread(threadData);
        setPosts(postsData);
        
        // Mark as read
        localStorage.setItem(`${THREAD_LAST_READ_PREFIX}${threadId}`, new Date().toISOString());
        dispatchStorageUpdatedEvent();
      }
    } catch (e) {
      console.error("Failed to fetch thread data:", e);
      setError("Failed to load thread data.");
    } finally {
      setIsLoading(false);
    }
  }, [forumId, threadId]);

  useEffect(() => {
    fetchThreadData();
  }, [fetchThreadData]);

  const handleReplySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
        toast({ title: "Authentication required", description: "You must be logged in to reply.", variant: "destructive" });
        return;
    }
    if (!replyContent.trim()) return;

    setIsSubmittingReply(true);

    const result = await S_createPost({
        forumId,
        threadId,
        content: replyContent,
        authorId: currentUser.uid,
        authorName: currentUser.displayName || "User",
        authorAvatar: currentUser.photoURL || undefined
    });

    if (result.success && result.post) {
        setPosts(prev => [...prev, result.post!]);
        setReplyContent("");
        toast({ title: "Reply Posted!" });
        
        // Update last read since we just posted
        localStorage.setItem(`${THREAD_LAST_READ_PREFIX}${threadId}`, new Date().toISOString());
        dispatchStorageUpdatedEvent();
    } else {
        toast({ title: "Error", description: result.message || "Failed to post reply.", variant: "destructive" });
    }
    
    setIsSubmittingReply(false);
  };

  const handleDeletePost = async (postId: string) => {
      if (!currentUser || !forum) return;
      setIsDeletingPost(postId);
      const result = await S_deletePost(forumId, threadId, postId, currentUser.uid);
      if (result.success) {
          toast({ title: "Message deleted" });
          setPosts(prev => prev.filter(p => p.id !== postId));
      } else {
          toast({ title: "Error", description: result.message, variant: "destructive" });
      }
      setIsDeletingPost(null);
  };

  const pageActions = (
    <Button variant="outline" size="sm" asChild>
      <Link href={`/forums/${forumId}`}><ArrowLeft className="mr-2 h-4 w-4"/> Back to Forum</Link>
    </Button>
  );

  if (isLoading) {
    return (
      <PageShell title="Loading Thread..." description="Please wait." actions={pageActions}>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  if (error || !thread) {
    return (
      <PageShell title="Error" description={error || "Could not load thread."} actions={pageActions}>
        <Card className="text-center py-10">
          <CardHeader>
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
            <CardTitle>Thread Not Found</CardTitle>
            <CardDescription>
              The thread you are looking for does not exist or has been moved.
            </CardDescription>
          </CardHeader>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title={thread.title} description={`A discussion started by ${thread.authorName}.`} actions={pageActions}>
      <div className="space-y-4">
        {posts.map((post, index) => (
          <Card key={post.id} id={`post-${post.id}`}>
            <CardHeader className="flex flex-row items-center justify-between p-4 bg-muted/50">
              <div className="flex items-center gap-3">
                <Link href={`/profile/${post.authorId}`} className="group flex items-center gap-3">
                    <Avatar>
                    <AvatarImage src={post.authorAvatar} />
                    <AvatarFallback>{post.authorName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                    <p className="font-semibold group-hover:underline">{post.authorName}</p>
                    <p className="text-xs text-muted-foreground"><TimeAgo dateString={post.createdAt} /></p>
                    </div>
                </Link>
              </div>
              
              {currentUser && forum && (currentUser.uid === post.authorId || currentUser.uid === forum.creatorId) && (
                  <AlertDialog>
                      <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" disabled={isDeletingPost === post.id}>
                              <Trash2 className="h-4 w-4" />
                          </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Delete Message?</AlertDialogTitle>
                              <AlertDialogDescription>
                                  Are you sure you want to delete this message? This action cannot be undone.
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeletePost(post.id)} className="bg-destructive hover:bg-destructive/90">
                                  Delete
                              </AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
              )}
            </CardHeader>
            <CardContent className="p-4">
              <div className="prose dark:prose-invert max-w-none text-foreground">
                <ReactMarkdown
                    components={{
                        a: ({node, ...props}) => <a className="text-primary hover:underline not-prose" {...props} />
                    }}
                >
                    {post.content}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {currentUser ? (
        <>
            <Separator className="my-6" />
            <Card>
                <form onSubmit={handleReplySubmit}>
                    <CardHeader>
                        <CardTitle>Post a Reply</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Textarea 
                            placeholder="Share your thoughts..."
                            rows={5}
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            disabled={isSubmittingReply}
                        />
                    </CardContent>
                    <CardFooter className="justify-end">
                        <Button type="submit" disabled={isSubmittingReply || !replyContent.trim()}>
                            {isSubmittingReply ? "Posting..." : "Post Reply"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </>
      ) : (
        <Card className="mt-6 text-center p-6">
            <CardTitle>Join the Conversation</CardTitle>
            <CardDescription className="mt-2">You must be logged in to post a reply.</CardDescription>
            <Button asChild className="mt-4">
                <Link href={`/login?redirect=/forums/${forumId}/${threadId}`}>
                    Login to Reply
                </Link>
            </Button>
        </Card>
      )}

    </PageShell>
  );
}
