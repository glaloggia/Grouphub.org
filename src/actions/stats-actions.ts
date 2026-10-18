'use server';

import { getAdminFirestoreInstance } from "@/lib/firebase-admin";

export interface PublicStats {
  users: number;
  groups: number;
  events: number;
  messages: number;
}

export async function getPublicStats(): Promise<PublicStats> {
  const db = getAdminFirestoreInstance();

  try {
    const usersPromise = db.collection('users').count().get();
    const groupsPromise = db.collection('groups').count().get();
    const eventsPromise = db.collection('events').count().get();
    
    // Process public groups for message count
    const publicGroupsSnapshot = await db.collection('groups').where('isPublic', '==', true).get();

    const messageCountPromises = publicGroupsSnapshot.docs.map(doc => 
        doc.ref.collection('messages').count().get()
    );
    
    const messageCountSnapshots = await Promise.all(messageCountPromises);
    const totalMessages = messageCountSnapshots.reduce((sum, snapshot) => sum + snapshot.data().count, 0);

    const [usersSnapshot, groupsSnapshot, eventsSnapshot] = await Promise.all([
      usersPromise,
      groupsPromise,
      eventsPromise,
    ]);

    return {
      users: usersSnapshot.data().count,
      groups: groupsSnapshot.data().count,
      events: eventsSnapshot.data().count,
      messages: totalMessages,
    };
  } catch (error) {
    console.error("[StatsActions] Error:", error);
    return { users: 0, groups: 0, events: 0, messages: 0 };
  }
}
