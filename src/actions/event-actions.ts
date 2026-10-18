'use server';

import { getAdminFirestoreInstance, getAdminStorageInstance, safeParseDateOnlyString } from "@/lib/firebase-admin";
import type { Event } from '@/types';
import { getGroupById } from './group-actions';
import { Buffer } from 'buffer';
import * as admin from 'firebase-admin';
import { docDataToEvent } from './event-data-mappers';
import { generateEventOccurrences, isEventInstancePast as isDatePast } from "@/lib/event-utils";
import { addMonths, startOfDay } from "date-fns";

interface CreateEventData {
  name: string;
  description?: string;
  date: string;
  time?: string;
  duration?: number;
  location?: string;
  groupId: string;
  group: string;
  image: string;
  attendees: string[];
  creatorId: string;
  isRecurring?: boolean;
  recurrence?: Event['recurrence'];
}

export async function createEvent(
  data: CreateEventData
): Promise<{ success: boolean; message?: string; event?: Event }> {
  const db = getAdminFirestoreInstance();
  const eventsCollection = db.collection("events");

  try {
    const groupForEvent = await getGroupById(data.groupId);
    if (!groupForEvent) {
      return { success: false, message: "Hosting group not found." };
    }
    const userIsAdminOrCreator = groupForEvent.adminIds.includes(data.creatorId) || groupForEvent.creatorId === data.creatorId;
    if (!userIsAdminOrCreator) {
      return { success: false, message: `Permission denied. You are not an admin or creator of group "${groupForEvent.name}".` };
    }
    
    const { image, ...eventDetails } = data;
    const defaultEventImage = groupForEvent.image || "https://placehold.co/600x400.png";

    const initialDocData: Omit<Event, 'id' | 'image' | 'createdAt' | 'updatedAt'> = {
      ...eventDetails,
      creatorId: data.creatorId,
      isCancelled: false,
      instanceAttendees: {},
      instanceMetadata: {},
      attendees: Array.isArray(data.attendees) ? data.attendees : [],
      isRecurring: data.isRecurring || false,
      isInstance: false,
      image: defaultEventImage,
    };

    const docRef = await eventsCollection.add({
        ...initialDocData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    let finalImageUrl = defaultEventImage;

    if (image && image.startsWith('data:image')) {
      const storage = getAdminStorageInstance();
      const bucket = storage.bucket();
      const matches = image.match(/^data:(.+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        const filePath = `events/${docRef.id}/banner-${Date.now()}`;
        const file = bucket.file(filePath);
        await file.save(buffer, { metadata: { contentType: mimeType } });
        await file.makePublic();
        finalImageUrl = file.publicUrl();
      }
    }

    await docRef.update({ image: finalImageUrl });
    const now = new Date().toISOString();
    const createdEvent: Event = { 
        ...initialDocData,
        id: docRef.id,
        image: finalImageUrl,
        createdAt: now,
        updatedAt: now,
    };

    return { success: true, event: createdEvent };
  } catch (error) {
    return { success: false, message: `Failed to create event in Firestore: ${(error as Error).message}` };
  }
}

export async function getAllMasterEvents(): Promise<Event[]> {
  const db = getAdminFirestoreInstance();
  const eventsCollection = db.collection("events");

  try {
    // Simplified query to be more index-resilient
    const q = eventsCollection.orderBy("createdAt", "desc");
    const querySnapshot = await q.get();
    const allEvents: Event[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      // Filter instances in memory if needed to avoid complex inequality indexes
      if (data.isInstance !== true) {
        allEvents.push(docDataToEvent(docSnap));
      }
    });
    return allEvents;
  } catch (error) {
    console.error("[EventActions - getAllMasterEvents] ERROR fetching events:", error);
    return []; 
  }
}

export async function S_getAttendingEvents(userId: string): Promise<Event[]> {
  const db = getAdminFirestoreInstance();
  const eventsCollection = db.collection("events");

  try {
    const q = eventsCollection.where("attendees", "array-contains", userId);
    const querySnapshot = await q.get();
    return querySnapshot.docs
        .map(docDataToEvent)
        .filter(e => e.isInstance !== true);
  } catch (error) {
    console.error(`[EventActions - S_getAttendingEvents] Error:`, error);
    return [];
  }
}

export async function getLatestMasterEvent(): Promise<Event | null> {
  const db = getAdminFirestoreInstance();
  const eventsCollection = db.collection("events");

  try {
    const q = eventsCollection.orderBy("createdAt", "desc").limit(1);
    const querySnapshot = await q.get();
    if (querySnapshot.empty) {
        return null;
    }
    const latestEventDoc = querySnapshot.docs[0];
    return docDataToEvent(latestEventDoc);
  } catch (error) {
    console.error("[EventActions - getLatestMasterEvent] Error fetching latest event:", error);
    return null;
  }
}

export async function getMasterEventById(eventId: string): Promise<Event | null> {
  const db = getAdminFirestoreInstance();
  const eventsCollection = db.collection("events");

  try {
    const masterEventId = eventId.includes("_") ? eventId.split("_")[0] : eventId;
    const eventDocRef = eventsCollection.doc(masterEventId);
    const eventDocSnap = await eventDocRef.get();
    if (eventDocSnap.exists) {
      return docDataToEvent(eventDocSnap);
    } else {
      return null;
    }
  } catch (error) {
    console.error(`[EventActions - getMasterEventById] Error fetching event ${eventId}:`, error);
    return null;
  }
}

export async function updateMasterEvent(
  eventId: string,
  eventData: Partial<Omit<Event, 'id' | 'groupId' | 'creatorId' | 'createdAt' | 'updatedAt'>>,
  currentUserId: string,
  permissionCheckGroupId: string
): Promise<{ success: boolean; message?: string; updatedEvent?: Event }> {
  const db = getAdminFirestoreInstance();
  const eventsCollection = db.collection("events");

  const masterEventId = eventId.includes("_") ? eventId.split("_")[0] : eventId;
  const eventDocRef = eventsCollection.doc(masterEventId);

  try {
    const eventSnap = await eventDocRef.get();
    if (!eventSnap.exists) {
      return { success: false, message: "Event not found." };
    }
    const eventToUpdate = docDataToEvent(eventSnap);

    const groupForEvent = await getGroupById(eventToUpdate.groupId);
    if (!groupForEvent) {
      return { success: false, message: "Hosting group not found." };
    }
    
    const isMember = groupForEvent.memberIds.includes(currentUserId);
    const isAdminOrCreator = groupForEvent.adminIds.includes(currentUserId) || groupForEvent.creatorId === currentUserId;

    const updateKeys = Object.keys(eventData);
    const isRsvpOnlyUpdate = updateKeys.length > 0 && updateKeys.every(key => key === 'attendees' || key === 'instanceAttendees');

    if (isRsvpOnlyUpdate) {
        if (!isMember) {
            return { success: false, message: `Permission denied. You must be a member of group "${groupForEvent.name}" to RSVP.` };
        }
    } 
    else {
        if (!isAdminOrCreator) {
            return { success: false, message: `Permission denied. You are not an admin or creator of group "${groupForEvent.name}".` };
        }
    }

    const { id: removedId, groupId: removedGroupId, creatorId: removedCreatorId, isInstance: removedIsInstance, createdAt, updatedAt, image, ...updatePayload } = eventData as any;
    let finalPayload: any = { 
        ...updatePayload,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (image && image.startsWith('data:image')) {
      const storage = getAdminStorageInstance();
      const bucket = storage.bucket();
      
      if (eventToUpdate.image && eventToUpdate.image.startsWith('https://storage.googleapis.com')) {
          try {
              const oldFileUrl = new URL(eventToUpdate.image);
              const bucketName = bucket.name;
              const pathStartIndex = oldFileUrl.pathname.indexOf(bucketName) + bucketName.length + 1;
              const oldFilePath = decodeURIComponent(oldFileUrl.pathname.substring(pathStartIndex));

              if (oldFilePath) {
                  await bucket.file(oldFilePath).delete();
              }
          } catch (deleteError: any) {
              if (deleteError.code !== 404) {
                 console.warn(`[EventActions - updateMasterEvent] Could not delete old image, but continuing update...`, deleteError);
              }
          }
      }
      
      const matches = image.match(/^data:(.+);base64,(.+)$/);
      if (!matches || matches.length !== 3) { return { success: false, message: 'Invalid image format.' }; }
      
      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      const filePath = `events/${masterEventId}/banner-${Date.now()}`;
      const file = bucket.file(filePath);
      
      await file.save(buffer, { metadata: { contentType: mimeType } });
      await file.makePublic();
      finalPayload.image = file.publicUrl();
    } else if (image) {
        finalPayload.image = image;
    }

    await eventDocRef.update(finalPayload);
    const updatedEventSnap = await eventDocRef.get();
    const updatedEvent = docDataToEvent(updatedEventSnap);

    return { success: true, updatedEvent: updatedEvent };
  } catch (error) {
    return { success: false, message: `Failed to update event. Firestore error: ${(error as Error).message}` };
  }
}


export async function deleteMasterEvent(
  eventId: string,
  currentUserId: string,
  permissionCheckGroupId: string
): Promise<{ success: boolean; message?: string }> {
  const db = getAdminFirestoreInstance();
  const eventsCollection = db.collection("events");

  const masterEventId = eventId.includes("_") ? eventId.split("_")[0] : eventId;
  const eventDocRef = eventsCollection.doc(masterEventId);

  try {
    const eventSnap = await eventDocRef.get();
    if (!eventSnap.exists) {
      return { success: false, message: "Event not found." };
    }
    const eventToDelete = docDataToEvent(eventSnap);

    const groupForEvent = await getGroupById(eventToDelete.groupId);
    if (!groupForEvent) {
      return { success: false, message: "Hosting group not found." };
    }
    
    if (groupForEvent.id !== permissionCheckGroupId && eventToDelete.groupId !== permissionCheckGroupId) {
        console.warn(`[EventActions - deleteMasterEvent] Mismatch: permissionCheckGroupId (${permissionCheckGroupId}) vs event's actual groupId (${eventToDelete.groupId}). Bailing out to prevent accidental deletion.`);
        return { success: false, message: "Internal error: Group ID mismatch."};
    }

    if (!groupForEvent.adminIds.includes(currentUserId) && groupForEvent.creatorId !== currentUserId) {
      return { success: false, message: `Permission denied. User is not an admin or creator of group "${groupForEvent.name}".` };
    }

    // Delete Firestore document
    await eventDocRef.delete();
    
    // Delete associated image folder from Cloud Storage
    if (eventToDelete.image && eventToDelete.image.startsWith('https://storage.googleapis.com')) {
      try {
          const storage = getAdminStorageInstance();
          const bucket = storage.bucket();
          const eventFolderPath = `events/${masterEventId}/`;
          await bucket.deleteFiles({ prefix: eventFolderPath });
      } catch (storageError) {
          console.warn(`[EventActions - deleteMasterEvent] Could not delete all files from Storage for event ${masterEventId}, but the event document was deleted.`, storageError);
      }
    }


    return { success: true, message: "Event deleted successfully." };
  } catch (error) {
    return { success: false, message: "Failed to delete event. Firestore error: ${(error as Error).message}" };
  }
}

export async function S_getEventsForGroup(groupId: string): Promise<Event[]> {
  const db = getAdminFirestoreInstance();
  const eventsCollection = db.collection("events");

  try {
    const q = eventsCollection.where("groupId", "==", groupId);
    const querySnapshot = await q.get();
    const groupEvents: Event[] = [];
    querySnapshot.forEach((docSnap) => {
      const event = docDataToEvent(docSnap);
      if (event.isInstance !== true) {
        groupEvents.push(event);
      }
    });
    return groupEvents;
  } catch (error) {
    console.error(`[EventActions - S_getEventsForGroup] Error fetching events for group ${groupId}:`, error);
    return [];
  }
}

export async function S_getRandomFutureEvent(): Promise<Event | null> {
    try {
      const allMasterEvents = await getAllMasterEvents();
      if (allMasterEvents.length === 0) {
        return null;
      }
  
      const futureEvents: Event[] = [];
      const today = startOfDay(new Date());
      const rangeEnd = addMonths(today, 12); 
  
      allMasterEvents.forEach(masterEvent => {
        if (masterEvent.isCancelled) {
          return;
        }
        
        if (masterEvent.isRecurring && masterEvent.recurrence) {
          const instances = generateEventOccurrences(masterEvent, today, rangeEnd);
          instances.forEach(instance => {
            futureEvents.push(instance);
          });
        } else if (!masterEvent.isInstance) {
          if (!isDatePast(masterEvent.date)) {
            futureEvents.push(masterEvent);
          }
        }
      });
  
      if (futureEvents.length === 0) {
        return null;
      }
  
      const randomIndex = Math.floor(Math.random() * futureEvents.length);
      return futureEvents[randomIndex];
  
    } catch (error) {
      console.error('[EventActions - S_getRandomFutureEvent] Error fetching random future event:', error);
      return null;
    }
  }
