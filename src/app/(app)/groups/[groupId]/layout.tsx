import { getGroupById } from '@/actions/group-actions';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ groupId: string }>
}

export async function generateMetadata(
  { params }: Props,
): Promise<Metadata> {
  const { groupId } = await params;
  const group = await getGroupById(groupId);

  if (!group) {
    return {
      title: 'Group Not Found',
      description: 'The group you are looking for could not be found.',
    }
  }

  return {
    title: `${group.name}`,
    description: group.description || `Join the ${group.name} group on GroupHub.`,
    openGraph: {
        title: `${group.name} | GroupHub`,
        description: group.description || `Join the ${group.name} group on GroupHub.`,
        images: [
            {
                url: group.image || '/icon.svg',
                width: 800,
                height: 600,
                alt: group.name,
            },
        ],
    },
  }
}

export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ groupId: string }>;
}) {
  await params;
  return <>{children}</>
}
