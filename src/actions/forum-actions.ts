
'use server';

import type { Forum, ForumThread, ForumPost } from '@/types';
import { getAdminFirestoreInstance, safeParseFirestoreTimestamp } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import * as admin from 'firebase-admin';

// --- Data Mappers ---

const getDefaultVercelAvatar = (identifier: string | null | undefined): string => {
    const textIdentifier = identifier || 'User';
    const firstChar = (textIdentifier.charAt(0) || 'U').toUpperCase();
    return `https://avatar.vercel.sh/${encodeURIComponent(textIdentifier)}.png?text=${firstChar}`;
};

const _docDataToForum = (docSnap: admin.firestore.DocumentSnapshot): Forum => {
    const data = docSnap.data() || {};
    
    let lastPostData;
    if (data.lastPost && typeof data.lastPost === 'object') {
        lastPostData = {
            threadId: data.lastPost.threadId || "",
            threadTitle: data.lastPost.threadTitle || "Untitled",
            postedAt: safeParseFirestoreTimestamp(data.lastPost.postedAt),
        };
    }

    return {
        id: docSnap.id,
        name: data.name || "Untitled Forum",
        description: data.description || "",
        creatorId: data.creatorId || "",
        threadCount: data.threadCount || 0,
        postCount: data.postCount || 0,
        lastPost: lastPostData,
        createdAt: safeParseFirestoreTimestamp(data.createdAt),
        updatedAt: safeParseFirestoreTimestamp(data.updatedAt),
    };
};

const _docDataToForumThread = (docSnap: admin.firestore.DocumentSnapshot): ForumThread => {
    const data = docSnap.data() || {};
    
    let lastPostData;
    if (data.lastPost && typeof data.lastPost === 'object') {
        lastPostData = {
            postId: data.lastPost.postId || "",
            authorId: data.lastPost.authorId || "unknown_author",
            authorName: data.lastPost.authorName || "User",
            postedAt: safeParseFirestoreTimestamp(data.lastPost.postedAt),
        };
    }

    return {
        id: docSnap.id,
        forumId: data.forumId || "unknown_forum",
        title: data.title || "Untitled Thread",
        authorId: data.authorId || "unknown_author",
        authorName: data.authorName || "Unknown User",
        postCount: data.postCount || 0,
        viewCount: data.viewCount || 0,
        lastPost: lastPostData,
        createdAt: safeParseFirestoreTimestamp(data.createdAt),
        updatedAt: safeParseFirestoreTimestamp(data.updatedAt),
    };
};

const _docDataToForumPost = (docSnap: admin.firestore.DocumentSnapshot): ForumPost => {
    const data = docSnap.data() || {};
    return {
        id: docSnap.id,
        threadId: data.threadId || "unknown_thread",
        forumId: data.forumId || "unknown_forum",
        authorId: data.authorId || "unknown_author",
        authorName: data.authorName || "Unknown User",
        authorAvatar: data.authorAvatar || getDefaultVercelAvatar(data.authorName || data.authorId),
        content: data.content || "",
        createdAt: safeParseFirestoreTimestamp(data.createdAt),
        updatedAt: safeParseFirestoreTimestamp(data.updatedAt),
    };
};


// --- Server Actions ---

export async function S_getAllForums(): Promise<Forum[]> {
  const db = getAdminFirestoreInstance();
  try {
    const snapshot = await db.collection("forums").get();
    return snapshot.docs.map(_docDataToForum);
  } catch (error) {
    console.error("Error fetching forums:", error);
    return [];
  }
}

export async function S_getForumById(forumId: string): Promise<Forum | null> {
  const db = getAdminFirestoreInstance();
  try {
    const docSnap = await db.collection("forums").doc(forumId).get();
    if (docSnap.exists) {
      return _docDataToForum(docSnap);
    }
    return null;
  } catch (error) {
    console.error(`Error fetching forum ${forumId}:`, error);
    return null;
  }
}

export async function S_getThreadsForForum(forumId: string): Promise<ForumThread[]> {
    const db = getAdminFirestoreInstance();
    try {
        const threadsSnapshot = await db.collection("forums").doc(forumId).collection('threads').orderBy('updatedAt', 'desc').get();
        return threadsSnapshot.docs.map(_docDataToForumThread);
    } catch (error) {
        console.error(`Error fetching threads for forum ${forumId}:`, error);
        return [];
    }
}

export async function S_getThreadById(forumId: string, threadId: string): Promise<ForumThread | null> {
    const db = getAdminFirestoreInstance();
    try {
        const threadDocRef = db.collection("forums").doc(forumId).collection('threads').doc(threadId);
        const threadDocSnap = await threadDocRef.get();
        if (threadDocSnap.exists) {
            // Increment view count, but don't wait for it and don't fail if it does.
            threadDocRef.update({ viewCount: FieldValue.increment(1) }).catch(e => console.warn("Failed to increment view count", e));
            return _docDataToForumThread(threadDocSnap);
        }
        return null;
    } catch (error) {
        console.error(`Error fetching thread ${threadId} from forum ${forumId}:`, error);
        return null;
    }
}

export async function S_getPostsForThread(forumId: string, threadId: string): Promise<ForumPost[]> {
    const db = getAdminFirestoreInstance();
    try {
        const postsSnapshot = await db.collection("forums").doc(forumId).collection('threads').doc(threadId).collection('posts').orderBy('createdAt', 'asc').get();
        return postsSnapshot.docs.map(_docDataToForumPost);
    } catch (error) {
        console.error(`Error fetching posts for thread ${threadId}:`, error);
        return [];
    }
}

interface CreateForumData {
    name: string;
    description: string;
    creatorId: string;
}

export async function S_createForum(data: CreateForumData): Promise<{ success: boolean; message?: string; forum?: Forum }> {
    if (!data.creatorId) {
        return { success: false, message: "A user must be logged in to create a forum." };
    }
    if (!data.name) {
        return { success: false, message: "Forum name cannot be empty." };
    }

    const db = getAdminFirestoreInstance();
    try {
        const newForumData = {
            name: data.name,
            description: data.description,
            creatorId: data.creatorId,
            threadCount: 0,
            postCount: 0,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        const newForumRef = await db.collection("forums").add(newForumData);

        const createdForum: Forum = {
            id: newForumRef.id,
            name: data.name,
            description: data.description,
            creatorId: data.creatorId,
            threadCount: 0,
            postCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }

        return { success: true, forum: createdForum };

    } catch (error) {
        console.error("Error creating forum:", error);
        return { success: false, message: `Failed to create forum: ${(error as Error).message}` };
    }
}

export interface LatestForumActivity {
  forumId: string;
  forumName: string;
  threadId: string;
  threadTitle: string;
  postedAt: string;
}

export async function S_getLatestForumActivity(limit: number): Promise<LatestForumActivity[]> {
    const allForums = await S_getAllForums();

    // Filter for forums that have valid lastPost data
    const forumsWithActivity = allForums.filter(forum => 
        forum && 
        forum.lastPost && 
        typeof forum.lastPost === 'object' && 
        forum.lastPost.postedAt
    );

    // Sort by date, with safety checks for invalid dates
    const sortedActivity = forumsWithActivity.sort((a, b) => {
        try {
            // The '!' is safe because of the filter above
            const dateA = new Date(a.lastPost!.postedAt).getTime();
            const dateB = new Date(b.lastPost!.postedAt).getTime();
            
            // Handle cases where a date might be invalid despite precautions
            if (isNaN(dateA)) return 1;  // push invalid dates to the end
            if (isNaN(dateB)) return -1; // push invalid dates to the end
            
            return dateB - dateA;
        } catch (e) {
            // In case of a catastrophic parsing error, don't sort these items
            console.error("Error parsing date during forum activity sort:", e);
            return 0;
        }
    });

    // Map to the final shape, assertions are safe due to the filter
    return sortedActivity.slice(0, limit).map(forum => ({
        forumId: forum.id,
        forumName: forum.name,
        threadId: forum.lastPost!.threadId,
        threadTitle: forum.lastPost!.threadTitle,
        postedAt: forum.lastPost!.postedAt,
    }));
}

export interface CreateThreadData {
    forumId: string;
    title: string;
    content: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
}

export async function S_createThread(data: CreateThreadData): Promise<{ success: boolean; message?: string; thread?: ForumThread }> {
    const { forumId, title, content, authorId, authorName, authorAvatar } = data;

    if (!authorId) {
        return { success: false, message: "You must be logged in to create a thread." };
    }
    if (!title.trim() || !content.trim()) {
        return { success: false, message: "Title and content are required." };
    }

    const db = getAdminFirestoreInstance();
    const forumDocRef = db.collection("forums").doc(forumId);

    try {
        const newThreadRef = forumDocRef.collection('threads').doc();
        const newPostRef = newThreadRef.collection('posts').doc();
        const serverTimestamp = FieldValue.serverTimestamp();

        await db.runTransaction(async (transaction) => {
            const forumDoc = await transaction.get(forumDocRef);
            if (!forumDoc.exists) {
                throw new Error("Forum not found.");
            }

            const newPostData: any = {
                id: newPostRef.id,
                threadId: newThreadRef.id,
                forumId: forumId,
                authorId: authorId,
                authorName: authorName,
                content: content,
                createdAt: serverTimestamp,
                updatedAt: serverTimestamp,
            };
            if (authorAvatar) {
                newPostData.authorAvatar = authorAvatar;
            }
            transaction.set(newPostRef, newPostData);
            
            const newThreadData = {
                id: newThreadRef.id,
                forumId: forumId,
                title: title,
                authorId: authorId,
                authorName: authorName,
                postCount: 1,
                viewCount: 0,
                lastPost: {
                    postId: newPostRef.id,
                    authorId: authorId,
                    authorName: authorName,
                    postedAt: serverTimestamp,
                },
                createdAt: serverTimestamp,
                updatedAt: serverTimestamp,
            };
            transaction.set(newThreadRef, newThreadData);

            transaction.update(forumDocRef, {
                threadCount: FieldValue.increment(1),
                postCount: FieldValue.increment(1),
                lastPost: {
                    threadId: newThreadRef.id,
                    threadTitle: title,
                    postedAt: serverTimestamp,
                },
            });

            // Track participation for notifications
            const userRef = db.collection('users').doc(authorId);
            transaction.update(userRef, {
                participatedThreadIds: FieldValue.arrayUnion(newThreadRef.id)
            });
        });

        const now = new Date().toISOString();
        const createdThread: ForumThread = {
            id: newThreadRef.id,
            forumId: forumId,
            title: title,
            authorId: authorId,
            authorName: authorName,
            postCount: 1,
            viewCount: 0,
            lastPost: {
                postId: newPostRef.id,
                authorId: authorId,
                authorName: authorName,
                postedAt: now,
            },
            createdAt: now,
            updatedAt: now,
        };

        return { success: true, thread: createdThread };

    } catch (error) {
        console.error("Error creating thread:", error);
        return { success: false, message: `Failed to create thread: ${(error as Error).message}` };
    }
}

export interface CreatePostData {
    forumId: string;
    threadId: string;
    content: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
}

export async function S_createPost(data: CreatePostData): Promise<{ success: boolean; message?: string; post?: ForumPost }> {
    const { forumId, threadId, content, authorId, authorName, authorAvatar } = data;

    if (!authorId) {
        return { success: false, message: "You must be logged in to post a reply." };
    }
    if (!content.trim()) {
        return { success: false, message: "Reply content cannot be empty." };
    }

    const db = getAdminFirestoreInstance();
    const forumDocRef = db.collection("forums").doc(forumId);
    const threadDocRef = forumDocRef.collection('threads').doc(threadId);

    try {
        const newPostRef = threadDocRef.collection('posts').doc();
        const serverTimestamp = FieldValue.serverTimestamp();

        await db.runTransaction(async (transaction) => {
            const [forumDoc, threadDoc] = await Promise.all([
                transaction.get(forumDocRef),
                transaction.get(threadDocRef)
            ]);

            if (!forumDoc.exists) throw new Error("Forum not found.");
            if (!threadDoc.exists) throw new Error("Thread not found.");
            
            const threadData = threadDoc.data()!;

            const newPostData: any = {
                threadId: threadId,
                forumId: forumId,
                authorId: authorId,
                authorName: authorName,
                content: content,
            };
            if (authorAvatar) {
                newPostData.authorAvatar = authorAvatar;
            }
            
            transaction.set(newPostRef, {
                ...newPostData,
                createdAt: serverTimestamp,
                updatedAt: serverTimestamp,
            });
            
            // Update thread metadata
            transaction.update(threadDocRef, {
                postCount: FieldValue.increment(1),
                lastPost: {
                    postId: newPostRef.id,
                    authorId: authorId,
                    authorName: authorName,
                    postedAt: serverTimestamp,
                },
                updatedAt: serverTimestamp, // Bump thread to the top
            });

            // Update forum metadata
            transaction.update(forumDocRef, {
                postCount: FieldValue.increment(1),
                lastPost: {
                    threadId: threadId,
                    threadTitle: threadData.title || "Untitled Thread",
                    postedAt: serverTimestamp,
                },
            });

            // Track participation for notifications
            const userRef = db.collection('users').doc(authorId);
            transaction.update(userRef, {
                participatedThreadIds: FieldValue.arrayUnion(threadId)
            });
        });

        const now = new Date().toISOString();
        const createdPost: ForumPost = {
            id: newPostRef.id,
            threadId: threadId,
            forumId: forumId,
            authorId: authorId,
            authorName: authorName,
            authorAvatar: authorAvatar,
            content: content,
            createdAt: now,
            updatedAt: now,
        };
        
        return { success: true, post: createdPost };

    } catch (error) {
        console.error("Error creating post:", error);
        return { success: false, message: `Failed to create post: ${(error as Error).message}` };
    }
}

export async function S_getParticipatedThreads(userId: string): Promise<ForumThread[]> {
    const db = getAdminFirestoreInstance();
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) return [];
        const participatedIds: string[] = userDoc.data()?.participatedThreadIds || [];
        if (participatedIds.length === 0) return [];

        const results: ForumThread[] = [];
        // Firestore can only query 30 IDs at once
        const chunks: string[][] = [];
        for (let i = 0; i < participatedIds.length; i += 30) {
            chunks.push(participatedIds.slice(i, i + 30));
        }

        for (const chunk of chunks) {
            const threadSnapshot = await db.collectionGroup('threads').where(admin.firestore.FieldPath.documentId(), 'in', chunk).get();
            threadSnapshot.forEach(doc => results.push(_docDataToForumThread(doc)));
        }

        return results;
    } catch (error) {
        console.error("Error fetching participated threads:", error);
        return [];
    }
}

export async function S_deleteForum(forumId: string, userId: string): Promise<{ success: boolean; message?: string }> {
    const db = getAdminFirestoreInstance();
    const ownerUid = process.env.NEXT_PUBLIC_OWNER_UID;
    if (!ownerUid || userId !== ownerUid) {
        return { success: false, message: "Permission denied. Only the app owner can delete forums." };
    }

    try {
        const forumDocRef = db.collection("forums").doc(forumId);
        
        // Firestore doesn't automatically delete subcollections. 
        // For a prototype, we'll manually iterate through threads and posts.
        const threadsSnapshot = await forumDocRef.collection('threads').get();
        
        for (const threadDoc of threadsSnapshot.docs) {
            const postsSnapshot = await threadDoc.ref.collection('posts').get();
            const batch = db.batch();
            postsSnapshot.forEach(postDoc => batch.delete(postDoc.ref));
            batch.delete(threadDoc.ref);
            await batch.commit();
        }

        await forumDocRef.delete();
        return { success: true };
    } catch (error) {
        console.error(`[S_deleteForum] Error deleting forum ${forumId}:`, error);
        return { success: false, message: (error as Error).message };
    }
}

export async function S_deleteThread(forumId: string, threadId: string, userId: string): Promise<{ success: boolean; message?: string }> {
    const db = getAdminFirestoreInstance();
    if (!userId) return { success: false, message: "Unauthorized." };

    try {
        const forumDocRef = db.collection("forums").doc(forumId);
        const threadDocRef = forumDocRef.collection('threads').doc(threadId);

        const [forumSnap, threadSnap] = await Promise.all([
            forumDocRef.get(),
            threadDocRef.get()
        ]);

        if (!forumSnap.exists || !threadSnap.exists) {
            return { success: false, message: "Forum or thread not found." };
        }

        const forumData = forumSnap.data()!;
        const threadData = threadSnap.data()!;

        // Check permission: author or forum creator
        if (userId !== threadData.authorId && userId !== forumData.creatorId) {
            return { success: false, message: "Permission denied." };
        }

        const postCountInThread = threadData.postCount || 0;

        const batch = db.batch();
        
        // Delete all posts in thread
        const postsSnapshot = await threadDocRef.collection('posts').get();
        postsSnapshot.forEach(postDoc => batch.delete(postDoc.ref));
        
        // Delete thread
        batch.delete(threadDocRef);

        // Update forum metadata
        batch.update(forumDocRef, {
            threadCount: FieldValue.increment(-1),
            postCount: FieldValue.increment(-postCountInThread)
        });

        await batch.commit();
        return { success: true };
    } catch (error) {
        console.error("Error deleting thread:", error);
        return { success: false, message: (error as Error).message };
    }
}

export async function S_deletePost(forumId: string, threadId: string, postId: string, userId: string): Promise<{ success: boolean; message?: string }> {
    const db = getAdminFirestoreInstance();
    if (!userId) return { success: false, message: "Unauthorized." };

    try {
        const forumDocRef = db.collection("forums").doc(forumId);
        const threadDocRef = forumDocRef.collection('threads').doc(threadId);
        const postDocRef = threadDocRef.collection('posts').doc(postId);

        const [forumSnap, threadSnap, postSnap] = await Promise.all([
            forumDocRef.get(),
            threadDocRef.get(),
            postDocRef.get()
        ]);

        if (!forumSnap.exists || !threadSnap.exists || !postSnap.exists) {
            return { success: false, message: "Forum, thread or post not found." };
        }

        const forumData = forumSnap.data()!;
        const postData = postSnap.data()!;

        // Check permission: author or forum creator
        if (userId !== postData.authorId && userId !== forumData.creatorId) {
            return { success: false, message: "Permission denied." };
        }

        const batch = db.batch();
        batch.delete(postDocRef);
        batch.update(threadDocRef, { postCount: FieldValue.increment(-1) });
        batch.update(forumDocRef, { postCount: FieldValue.increment(-1) });

        await batch.commit();
        return { success: true };
    } catch (error) {
        console.error("Error deleting post:", error);
        return { success: false, message: (error as Error).message };
    }
}
