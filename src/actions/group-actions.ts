
'use server';

import type { Group, GroupJoinRequest, Event } from '@/types';
import { getAdminFirestoreInstance, getAdminStorageInstance, safeParseFirestoreTimestamp } from "@/lib/firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import * as admin from 'firebase-admin';
import { docDataToEvent } from './event-data-mappers';
import { Buffer } from 'buffer';


const getDefaultGroupAvatar = (identifier: string | null | undefined): string => {
    const textIdentifier = identifier || 'Group';
    const firstChar = (textIdentifier.charAt(0) || 'G').toUpperCase();
    return `https://avatar.vercel.sh/${encodeURIComponent(textIdentifier)}.png?text=${firstChar}`;
};

// Safe constructor for Group objects from Firestore data
const _docDataToGroup = (docSnap: admin.firestore.DocumentSnapshot): Group => {
    const data = docSnap.data() || {};
    return {
        id: docSnap.id,
        name: data.name || "Unnamed Group",
        description: data.description || "",
        image: data.image || getDefaultGroupAvatar(data.name || docSnap.id),
        memberIds: Array.isArray(data.memberIds) ? data.memberIds : [],
        isPublic: typeof data.isPublic === 'boolean' ? data.isPublic : false,
        creatorId: data.creatorId || "unknown_creator",
        adminIds: Array.isArray(data.adminIds) ? data.adminIds : [],
        createdAt: safeParseFirestoreTimestamp(data.createdAt),
        updatedAt: safeParseFirestoreTimestamp(data.updatedAt),
    };
};

const _docDataToGroupJoinRequest = (docSnap: admin.firestore.DocumentSnapshot): GroupJoinRequest => {
    const data = docSnap.data() || {};
    const validStatuses = ['pending', 'accepted', 'declined'];
    
    return {
        id: docSnap.id,
        groupId: data.groupId || '',
        userId: data.userId || '',
        userName: data.userName || 'Unknown User',
        userAvatar: data.userAvatar, // Can be undefined
        timestamp: safeParseFirestoreTimestamp(data.timestamp),
        status: validStatuses.includes(data.status) ? data.status : 'pending',
    };
};

interface CreateGroupData {
  name: string;
  description: string;
  isPublic: boolean;
  creatorId: string;
  image?: string; 
}

export async function createGroup(
  data: CreateGroupData
): Promise<{ success: boolean; message?: string; group?: Group }> {
  const db = getAdminFirestoreInstance();
  const groupsCollection = db.collection("groups");

  try {
    if (!data.creatorId) {
        return { success: false, message: "User authentication context is missing." };
    }

    const { image, ...groupDetails } = data;

    const newGroupData: Omit<Group, 'id' | 'createdAt' | 'updatedAt' | 'image'> = {
      ...groupDetails,
      memberIds: [data.creatorId],
      adminIds: [data.creatorId],
    };

    const newGroupRef = await groupsCollection.add({
        ...newGroupData,
        image: getDefaultGroupAvatar(data.name),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });
    
    let finalImageUrl = getDefaultGroupAvatar(data.name);

    if (image && image.startsWith('data:image')) {
        const storage = getAdminStorageInstance();
        const bucket = storage.bucket();
        const matches = image.match(/^data:(.+);base64,(.+)$/);
        if (matches && matches.length === 3) {
            const mimeType = matches[1];
            const base64Data = matches[2];
            const buffer = Buffer.from(base64Data, 'base64');
            const filePath = `groups/${newGroupRef.id}/avatar.jpg`;
            const file = bucket.file(filePath);
            await file.save(buffer, { metadata: { contentType: mimeType } });
            await file.makePublic();
            finalImageUrl = file.publicUrl();
        }
    }
    
    await newGroupRef.update({ image: finalImageUrl });

    const now = new Date().toISOString();
    const createdGroup: Group = { 
        ...newGroupData, 
        id: newGroupRef.id,
        image: finalImageUrl,
        createdAt: now,
        updatedAt: now,
    };

    return { success: true, group: createdGroup };

  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}


export async function getAllGroups(): Promise<Group[]> {
  const db = getAdminFirestoreInstance();
  const groupsCollection = db.collection("groups");

  try {
    const querySnapshot = await groupsCollection.get();
    const allGroups: Group[] = [];
    querySnapshot.forEach((docSnap) => {
      allGroups.push(_docDataToGroup(docSnap));
    });
    return allGroups;
  } catch (error) {
    console.error(`[GroupAction - getAllGroups] Error:`, error);
    return []; 
  }
}

export async function S_getMemberGroups(userId: string): Promise<Group[]> {
  const db = getAdminFirestoreInstance();
  const groupsCollection = db.collection("groups");

  try {
    const querySnapshot = await groupsCollection.where('memberIds', 'array-contains', userId).get();
    return querySnapshot.docs.map(_docDataToGroup);
  } catch (error) {
    console.error(`[GroupAction - S_getMemberGroups] Error:`, error);
    return [];
  }
}

export async function getLatestPublicGroup(): Promise<Group | null> {
    const db = getAdminFirestoreInstance();
    const groupsCollection = db.collection("groups");

    try {
      const q = groupsCollection.where('isPublic', '==', true).orderBy('createdAt', 'desc').limit(1);
      const querySnapshot = await q.get();
      if (querySnapshot.empty) {
          return null;
      }
      const latestGroupDoc = querySnapshot.docs[0];
      return _docDataToGroup(latestGroupDoc);
    } catch (error) {
      console.error("[GroupActions - getLatestPublicGroup] Error:", error);
      return null;
    }
}


export async function getGroupById(groupId: string): Promise<Group | null> {
  const db = getAdminFirestoreInstance();
  const groupsCollection = db.collection("groups");

  try {
    const groupDocRef = groupsCollection.doc(groupId);
    const groupDocSnap = await groupDocRef.get();
    if (groupDocSnap.exists) {
      return _docDataToGroup(groupDocSnap);
    } else {
      return null;
    }
  } catch (error) {
    console.error(`[GroupAction - getGroupById] Error fetching group ${groupId}:`, error);
    return null;
  }
}

export async function updateGroupSettings(
  groupId: string,
  data: { name: string; description: string; isPublic: boolean; image?: string | null },
  currentUserId: string
): Promise<{ success: boolean; message?: string; updatedGroup?: Group }> {
  const db = getAdminFirestoreInstance();
  const groupsCollection = db.collection("groups");

  try {
    const groupDocRef = groupsCollection.doc(groupId);
    const groupDocSnap = await groupDocRef.get();
    if (!groupDocSnap.exists) return { success: false, message: "Group not found." };

    const group = _docDataToGroup(groupDocSnap);
    if (group.creatorId !== currentUserId && !group.adminIds.includes(currentUserId)) {
      return { success: false, message: "Permission denied." };
    }

    const { image, ...textData } = data;
    const finalUpdatePayload: any = { 
        ...textData,
        updatedAt: FieldValue.serverTimestamp(),
    };
    
    if (image) { 
      const storage = getAdminStorageInstance();
      const bucket = storage.bucket();
      
      if (group.image && group.image.includes('storage.googleapis.com')) {
        try {
          const oldFilePath = `groups/${groupId}/avatar.jpg`;
          await bucket.file(oldFilePath).delete();
        } catch (deleteError: any) {
          if (deleteError.code !== 404) {
             console.warn(`Could not delete old group avatar, continuing...`, deleteError);
          }
        }
      }
      
      if (image.startsWith('data:image')) {
        const matches = image.match(/^data:(.+);base64,(.+)$/);
        if (!matches || matches.length !== 3) { return { success: false, message: 'Invalid image format.' }; }
        
        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        const filePath = `groups/${groupId}/avatar.jpg`;
        const file = bucket.file(filePath);
        
        await file.save(buffer, { metadata: { contentType: mimeType } });
        await file.makePublic();
        finalUpdatePayload.image = file.publicUrl();
      }
    } else if (image === null) { 
      finalUpdatePayload.image = getDefaultGroupAvatar(data.name || group.name);
    }

    await groupDocRef.update(finalUpdatePayload);
    const updatedGroupSnap = await groupDocRef.get();
    const updatedGroup = _docDataToGroup(updatedGroupSnap);
    return { success: true, updatedGroup };
  } catch (error) {
    return { success: false, message: `Failed to update group settings: ${(error as Error).message}` };
  }
}

export async function S_deleteGroup(groupId: string, currentUserId: string): Promise<{ success: boolean; message?: string }> {
  const db = getAdminFirestoreInstance();
  const groupsCollection = db.collection("groups");
  const groupJoinRequestsCollection = db.collection("groupJoinRequests");
  const eventsCollection = db.collection("events");

  const groupDocRef = groupsCollection.doc(groupId);
  const batch = db.batch();

  try {
    const groupDocSnap = await groupDocRef.get();
    if (!groupDocSnap.exists) return { success: false, message: "Group not found." };
    const group = _docDataToGroup(groupDocSnap);

    const isOwner = process.env.NEXT_PUBLIC_OWNER_UID === currentUserId;
    const isAdminOrCreator = group.creatorId === currentUserId || (Array.isArray(group.adminIds) && group.adminIds.includes(currentUserId));

    if (!isOwner && !isAdminOrCreator) {
      return { success: false, message: "Permission denied." };
    }

    batch.delete(groupDocRef);
    
    if (group.image && group.image.includes('storage.googleapis.com')) {
      const storage = getAdminStorageInstance();
      const bucket = storage.bucket();
      const folderPath = `groups/${groupId}/`;
      await bucket.deleteFiles({ prefix: folderPath });
    }

    const requestsQuery = groupJoinRequestsCollection.where("groupId", "==", groupId);
    const requestsSnapshot = await requestsQuery.get();
    requestsSnapshot.forEach(reqDoc => batch.delete(reqDoc.ref));

    const eventsQuery = eventsCollection.where("groupId", "==", groupId);
    const eventsSnapshot = await eventsQuery.get();
    eventsSnapshot.forEach(eventDoc => batch.delete(eventDoc.ref));


    await batch.commit();
    
    return { success: true, message: "Group deleted successfully." };
  } catch (error) {
    return { success: false, message: "Failed to delete group." };
  }
}

export async function S_joinGroup(groupId: string, userId: string): Promise<{ success: boolean; message?: string; updatedGroup?: Group }> {
  const db = getAdminFirestoreInstance();
  const groupsCollection = db.collection("groups");

  const groupDocRef = groupsCollection.doc(groupId);
  try {
    const groupDocSnap = await groupDocRef.get();
    if (!groupDocSnap.exists) return { success: false, message: "Group not found." };
    let group = _docDataToGroup(groupDocSnap);

    if (!group.isPublic) return { success: false, message: "Cannot directly join a private group." };
    if (group.memberIds.includes(userId)) return { success: true, updatedGroup: group, message: "Already a member." };

    await groupDocRef.update({ 
        memberIds: admin.firestore.FieldValue.arrayUnion(userId),
        updatedAt: FieldValue.serverTimestamp(),
    });
    const updatedGroupSnap = await groupDocRef.get();
    group = _docDataToGroup(updatedGroupSnap);
    return { success: true, updatedGroup: group, message: "Joined group." };
  } catch (error) {
    return { success: false, message: `Failed to join group: ${(error as Error).message}` };
  }
}

export async function S_joinGroupAndRsvpToEvent(groupId: string, eventId: string, userId: string): Promise<{ success: boolean; message?: string }> {
  const db = getAdminFirestoreInstance();
  const groupsCollection = db.collection("groups");
  const eventsCollection = db.collection("events");

  const masterEventId = eventId.includes("_") ? eventId.split("_")[0] : eventId;
  const instanceDate = eventId.includes("_") ? eventId.split("_")[1] : null;

  const groupDocRef = groupsCollection.doc(groupId);
  const eventDocRef = eventsCollection.doc(masterEventId);
  const timestamp = FieldValue.serverTimestamp();

  try {
    await db.runTransaction(async (transaction) => {
      const groupDoc = await transaction.get(groupDocRef);
      const eventDoc = await transaction.get(eventDocRef);

      if (!groupDoc.exists) throw new Error("Group not found.");
      if (!eventDoc.exists) throw new Error("Event not found.");

      const groupData = _docDataToGroup(groupDoc);
      const eventData = docDataToEvent(eventDoc);

      if (!groupData.isPublic) throw new Error("Cannot join private group this way.");
      
      transaction.update(groupDocRef, { 
          memberIds: FieldValue.arrayUnion(userId),
          updatedAt: timestamp,
      });

      if (instanceDate) {
        const newInstanceAttendees = { ...eventData.instanceAttendees };
        const currentAttendees = newInstanceAttendees[instanceDate] || [];
        if (!currentAttendees.includes(userId)) {
          newInstanceAttendees[instanceDate] = [...currentAttendees, userId];
        }
        transaction.update(eventDocRef, { instanceAttendees: newInstanceAttendees, updatedAt: timestamp });
      } else {
        transaction.update(eventDocRef, { attendees: FieldValue.arrayUnion(userId), updatedAt: timestamp });
      }
    });

    return { success: true, message: "Joined group and RSVP'd." };
  } catch (error) {
    return { success: false, message: `Failed: ${(error as Error).message}` };
  }
}


export async function S_leaveGroup(groupId: string, userId: string): Promise<{ success: boolean; message?: string; updatedGroup?: Group }> {
  const db = getAdminFirestoreInstance();
  const groupsCollection = db.collection("groups");

  const groupDocRef = groupsCollection.doc(groupId);
  try {
    const groupDocSnap = await groupDocRef.get();
    if (!groupDocSnap.exists) return { success: false, message: "Group not found." };
    let group = _docDataToGroup(groupDocSnap);

    if (group.creatorId === userId) {
      return { success: false, message: "Creator cannot leave the group." };
    }
    await groupDocRef.update({
      memberIds: admin.firestore.FieldValue.arrayRemove(userId),
      adminIds: admin.firestore.FieldValue.arrayRemove(userId),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const updatedGroupSnap = await groupDocRef.get();
    group = _docDataToGroup(updatedGroupSnap);
    return { success: true, updatedGroup: group };
  } catch (error) {
    return { success: false, message: `Failed to leave group: ${(error as Error).message}` };
  }
}

export async function S_removeMemberFromGroup(groupId: string, memberIdToRemove: string, adminUserId: string): Promise<{ success: boolean; message?: string; updatedGroup?: Group }> {
  const db = getAdminFirestoreInstance();
  const groupsCollection = db.collection("groups");

  const groupDocRef = groupsCollection.doc(groupId);
  try {
    const groupDocSnap = await groupDocRef.get();
    if (!groupDocSnap.exists) return { success: false, message: "Group not found." };
    let group = _docDataToGroup(groupDocSnap);

    if (group.creatorId !== adminUserId && !group.adminIds.includes(adminUserId)) return { success: false, message: "Permission denied." };
    if (memberIdToRemove === group.creatorId) return { success: false, message: "Cannot remove creator." };

    await groupDocRef.update({
      memberIds: admin.firestore.FieldValue.arrayRemove(memberIdToRemove),
      adminIds: admin.firestore.FieldValue.arrayRemove(memberIdToRemove),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const updatedGroupSnap = await groupDocRef.get();
    group = _docDataToGroup(updatedGroupSnap);
    return { success: true, updatedGroup: group };
  } catch (error) {
    return { success: false, message: `Failed to remove member: ${(error as Error).message}` };
  }
}

export async function S_promoteToAdmin(groupId: string, memberIdToPromote: string, adminUserId: string): Promise<{ success: boolean; message?: string; updatedGroup?: Group }> {
    const db = getAdminFirestoreInstance();
    const groupsCollection = db.collection("groups");

    const groupDocRef = groupsCollection.doc(groupId);
    try {
        const groupDocSnap = await groupDocRef.get();
        if (!groupDocSnap.exists) return { success: false, message: "Group not found." };
        let group = _docDataToGroup(groupDocSnap);

        if (group.creatorId !== adminUserId && !group.adminIds.includes(adminUserId)) return { success: false, message: "Permission denied." };
        if (!group.memberIds.includes(memberIdToPromote)) return { success: false, message: "User is not a member."};
        if (!group.adminIds.includes(memberIdToPromote)) {
            await groupDocRef.update({ 
                adminIds: admin.firestore.FieldValue.arrayUnion(memberIdToPromote),
                updatedAt: FieldValue.serverTimestamp(),
            });
            const updatedGroupSnap = await groupDocRef.get();
            group = _docDataToGroup(updatedGroupSnap);
        }
        return { success: true, updatedGroup: group };
    } catch (error) {
        return { success: false, message: `Failed: ${(error as Error).message}` };
    }
}

export async function S_demoteFromAdmin(groupId: string, adminIdToDemote: string, currentAdminUserId: string): Promise<{ success: boolean; message?: string; updatedGroup?: Group }> {
    const db = getAdminFirestoreInstance();
    const groupsCollection = db.collection("groups");

    const groupDocRef = groupsCollection.doc(groupId);
    try {
        const groupDocSnap = await groupDocRef.get();
        if (!groupDocSnap.exists) return { success: false, message: "Group not found." };
        let group = _docDataToGroup(groupDocSnap);

        if (group.creatorId !== currentAdminUserId && !group.adminIds.includes(currentAdminUserId)) {
          return { success: false, message: "Permission denied." };
        }
        if (adminIdToDemote === group.creatorId) {
             if (Array.isArray(group.adminIds) && group.adminIds.length === 1 && group.adminIds[0] === group.creatorId) {
                return { success: false, message: "Creator is the only admin."};
             }
        }

        await groupDocRef.update({ 
            adminIds: admin.firestore.FieldValue.arrayRemove(adminIdToDemote),
            updatedAt: FieldValue.serverTimestamp(),
        });
        const updatedGroupSnap = await groupDocRef.get();
        group = _docDataToGroup(updatedGroupSnap);
        return { success: true, updatedGroup: group };
    } catch (error) {
        return { success: false, message: `Failed: ${(error as Error).message}` };
    }
}

export async function S_requestToJoinGroup(groupId: string, userId: string, userName: string, userAvatar?: string): Promise<{ success: boolean; message?: string; request?: GroupJoinRequest }> {
  const db = getAdminFirestoreInstance();
  const groupsCollection = db.collection("groups");
  const groupJoinRequestsCollection = db.collection("groupJoinRequests");

  try {
    const groupDoc = await groupsCollection.doc(groupId).get();
    if (!groupDoc.exists) return { success: false, message: "Group not found." };
    const group = _docDataToGroup(groupDoc);
    if (group.isPublic) return { success: false, message: "Public group, join directly." };
    if (group.memberIds.includes(userId)) return { success: false, message: "Already member." };

    const q = groupJoinRequestsCollection.where("groupId", "==", groupId).where("userId", "==", userId).where("status", "==", "pending");
    const existingRequestSnap = await q.get();
    if (!existingRequestSnap.empty) {
      const existingRequest = { id: existingRequestSnap.docs[0].id, ...existingRequestSnap.docs[0].data() } as GroupJoinRequest;
      return { success: false, message: "Already pending.", request: existingRequest };
    }

    const newRequestDataForFirestore: any = {
        groupId, userId, userName,
        status: "pending",
        timestamp: admin.firestore.FieldValue.serverTimestamp() 
    };
    if (userAvatar) {
        newRequestDataForFirestore.userAvatar = userAvatar;
    }

    const requestRef = await groupJoinRequestsCollection.add(newRequestDataForFirestore);

    const now = new Date().toISOString();
    const newRequest: GroupJoinRequest = {
        id: requestRef.id,
        groupId,
        userId,
        userName,
        status: "pending",
        timestamp: now,
    };
    if (userAvatar) {
        newRequest.userAvatar = userAvatar;
    }
    return { success: true, request: newRequest };
  } catch (error) {
    return { success: false, message: "Failed to send request." };
  }
}

export async function S_getGroupJoinRequests(groupId: string, adminUserId: string): Promise<GroupJoinRequest[]> {
  const db = getAdminFirestoreInstance();
  const groupsCollection = db.collection("groups");
  const groupJoinRequestsCollection = db.collection("groupJoinRequests");

  try {
    const groupDoc = await groupsCollection.doc(groupId).get();
    if (!groupDoc.exists) return [];
    
    const group = _docDataToGroup(groupDoc);
    if (group.creatorId !== adminUserId && !group.adminIds.includes(adminUserId)) {
      return [];
    }
    const q = groupJoinRequestsCollection.where("groupId", "==", groupId).where("status", "==", "pending").orderBy("timestamp", "desc");
    const querySnapshot = await q.get();
    const requests: GroupJoinRequest[] = [];
    querySnapshot.forEach(docSnap => {
        requests.push(_docDataToGroupJoinRequest(docSnap));
    });
    return requests;
  } catch (error) {
    console.error(`[S_getGroupJoinRequests] Error:`, error);
    return [];
  }
}

export async function S_approveGroupJoinRequest(requestId: string, adminUserId: string): Promise<{ success: boolean; message?: string }> {
  const db = getAdminFirestoreInstance();
  const groupsCollection = db.collection("groups");
  const groupJoinRequestsCollection = db.collection("groupJoinRequests");

  const requestDocRef = groupJoinRequestsCollection.doc(requestId);
  const batch = db.batch();
  try {
    const requestDocSnap = await requestDocRef.get();
    if (!requestDocSnap.exists) return { success: false, message: "Request not found." };
    const request = _docDataToGroupJoinRequest(requestDocSnap);

    const groupDocRef = groupsCollection.doc(request.groupId);
    const groupDocSnap = await groupDocRef.get();
    if (!groupDocSnap.exists) return { success: false, message: "Group not found." };
    const group = _docDataToGroup(groupDocSnap);

    if (group.creatorId !== adminUserId && !group.adminIds.includes(adminUserId)) return { success: false, message: "Denied." };

    batch.update(groupDocRef, { 
        memberIds: admin.firestore.FieldValue.arrayUnion(request.userId),
        updatedAt: FieldValue.serverTimestamp(),
    });
    batch.delete(requestDocRef);
    await batch.commit();
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function S_denyGroupJoinRequest(requestId: string, adminUserId: string): Promise<{ success: boolean; message?: string }> {
  const db = getAdminFirestoreInstance();
  const groupsCollection = db.collection("groups");
  const groupJoinRequestsCollection = db.collection("groupJoinRequests");

  const requestDocRef = groupJoinRequestsCollection.doc(requestId);
  try {
    const requestDocSnap = await requestDocRef.get();
    if (!requestDocSnap.exists) return { success: false, message: "Request not found." };
    const request = _docDataToGroupJoinRequest(requestDocSnap);

    const groupDocSnap = await groupsCollection.doc(request.groupId).get();
    if (!groupDocSnap.exists) return { success: true }; // Just clean up request
    
    const group = _docDataToGroup(groupDocSnap);
    if (group.creatorId !== adminUserId && !group.adminIds.includes(adminUserId)) return { success: false, message: "Denied." };

    await requestDocRef.delete();
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function S_getRandomPublicGroup(): Promise<Group | null> {
  const db = getAdminFirestoreInstance();
  const groupsCollection = db.collection("groups");

  try {
    const q = groupsCollection.where('isPublic', '==', true).limit(50);
    const querySnapshot = await q.get();
    
    if (querySnapshot.empty) return null;
    
    const randomDocIndex = Math.floor(Math.random() * querySnapshot.size);
    return _docDataToGroup(querySnapshot.docs[randomDocIndex]);
  } catch (error) {
    console.error(`[GroupActions] Error:`, error);
    return null;
  }
}

export async function S_getMostPopularPublicGroup(): Promise<Group | null> {
  const db = getAdminFirestoreInstance();
  const groupsCollection = db.collection("groups");

  try {
    const publicGroupsSnapshot = await groupsCollection.where('isPublic', '==', true).get();
    if (publicGroupsSnapshot.empty) return null;
    
    const publicGroups = publicGroupsSnapshot.docs.map(_docDataToGroup);
    publicGroups.sort((a, b) => (b.memberIds?.length || 0) - (a.memberIds?.length || 0));
    return publicGroups[0];
  } catch (error) {
    console.error(`[GroupActions] Error:`, error);
    return null;
  }
}

export async function S_joinDefaultChatroom(userId: string): Promise<{ success: boolean }> {
  const db = getAdminFirestoreInstance();
  try {
    const groupsRef = db.collection("groups");
    const chatroomQuery = await groupsRef.where("name", "==", "Chatroom").limit(1).get();
    
    if (!chatroomQuery.empty) {
      const chatroomDoc = chatroomQuery.docs[0];
      await chatroomDoc.ref.update({
        memberIds: admin.firestore.FieldValue.arrayUnion(userId),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return { success: true };
    }
    return { success: false };
  } catch (error) {
    console.error("Error joining default chatroom:", error);
    return { success: false };
  }
}
