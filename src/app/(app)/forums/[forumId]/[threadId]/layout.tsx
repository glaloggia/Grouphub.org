import { S_getThreadById, S_getPostsForThread } from '@/actions/forum-actions';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ forumId: string; threadId: string }>
}

export async function generateMetadata(
  { params }: Props,
): Promise<Metadata> {
  const { forumId, threadId } = await params;
  const thread = await S_getThreadById(forumId, threadId);

  if (!thread) {
    return {
      title: 'Thread Not Found',
      description: 'The thread you are looking for could not be found.',
    }
  }

  const posts = await S_getPostsForThread(forumId, threadId);
  const firstPostContent = posts.length > 0 ? posts[0].content : '';

  return {
    title: `${thread.title}`,
    description: firstPostContent.substring(0, 150) || `Read the discussion for "${thread.title}" on GroupHub.`,
     openGraph: {
        title: `${thread.title} | GroupHub`,
        description: firstPostContent.substring(0, 150) || `Read the discussion for "${thread.title}" on GroupHub.`,
        images: [
            {
                url: '/icon.svg',
                width: 800,
                height: 600,
                alt: thread.title,
            },
        ],
    },
  }
}

export default async function ThreadLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ forumId: string; threadId: string }>;
}) {
  await params;
  return <>{children}</>
}
