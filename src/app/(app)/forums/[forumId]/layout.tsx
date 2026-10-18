import { S_getForumById } from '@/actions/forum-actions';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ forumId: string }>
}

export async function generateMetadata(
  { params }: Props,
): Promise<Metadata> {
  const { forumId } = await params;
  const forum = await S_getForumById(forumId);

  if (!forum) {
    return {
      title: 'Forum Not Found',
      description: 'The forum you are looking for could not be found.',
    }
  }

  return {
    title: `${forum.name} | GroupHub Forums`,
    description: forum.description || `Discussions in the ${forum.name} forum on GroupHub.`,
     openGraph: {
        title: `${forum.name} | GroupHub Forums`,
        description: forum.description || `Discussions in the ${forum.name} forum on GroupHub.`,
        images: [
            {
                url: '/icon.svg',
                width: 800,
                height: 600,
                alt: forum.name,
            },
        ],
    },
  }
}

export default async function ForumLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ forumId: string }>;
}) {
  await params;
  return <>{children}</>
}
