import { getMasterEventById } from '@/actions/event-actions';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ eventId: string }>
}

export async function generateMetadata(
  { params }: Props,
): Promise<Metadata> {
  const { eventId } = await params;
  const event = await getMasterEventById(eventId);

  if (!event) {
    return {
      title: 'Event Not Found',
      description: 'The event you are looking for could not be found.',
    }
  }

  return {
    title: `${event.name}`,
    description: event.description || `Join the event ${event.name} on GroupHub.`,
     openGraph: {
        title: `${event.name} | GroupHub`,
        description: event.description || `Join the event ${event.name} on GroupHub.`,
        images: [
            {
                url: event.image || '/icon.svg',
                width: 800,
                height: 600,
                alt: event.name,
            },
        ],
    },
  }
}

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  await params; // Ensure params are available even if not used directly in layout JSX
  return <>{children}</>
}
