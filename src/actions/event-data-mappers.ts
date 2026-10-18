
import type { Event } from '@/types';
import { safeParseDateOnlyString, safeParseFirestoreTimestamp } from "@/lib/firebase-admin";
import * as admin from 'firebase-admin';

export const docDataToEvent = (docSnap: admin.firestore.DocumentSnapshot): Event => {
    const data = docSnap.data() || {};
    
    let recurrenceRule;
    if (data.recurrence && typeof data.recurrence === 'object') {
        recurrenceRule = {
            ...data.recurrence,
            endDate: data.recurrence.endDate ? safeParseDateOnlyString(data.recurrence.endDate) : undefined,
        };
    } else {
        recurrenceRule = undefined;
    }

    return {
        id: docSnap.id,
        name: data.name || "Unnamed Event",
        description: data.description || "No description provided.",
        date: safeParseDateOnlyString(data.date),
        time: typeof data.time === 'string' ? data.time : undefined,
        duration: typeof data.duration === 'number' ? data.duration : undefined,
        location: data.location || "Not specified",
        groupId: data.groupId || "unknown_group",
        group: data.group || "Unknown Group",
        image: data.image && typeof data.image === 'string' && data.image.trim() !== '' ? data.image : "https://placehold.co/400x400.png",
        attendees: Array.isArray(data.attendees) ? data.attendees : [],
        isRecurring: typeof data.isRecurring === 'boolean' ? data.isRecurring : false,
        recurrence: recurrenceRule,
        isInstance: typeof data.isInstance === 'boolean' ? data.isInstance : false,
        masterEventId: data.masterEventId || undefined,
        instanceAttendees: data.instanceAttendees || {},
        isCancelled: typeof data.isCancelled === 'boolean' ? data.isCancelled : false,
        instanceMetadata: data.instanceMetadata || {},
        creatorId: data.creatorId || "unknown_creator",
        createdAt: safeParseFirestoreTimestamp(data.createdAt),
        updatedAt: safeParseFirestoreTimestamp(data.updatedAt),
      };
};

    
