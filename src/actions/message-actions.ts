'use server';

import type { Conversation, ChatMessage, ContactableUser } from "@/types";
import { getAdminFirestoreInstance, safeParseFirestoreTimestamp } from "@/lib/firebase-admin";
import { FieldValue, type DocumentSnapshot } from "firebase-admin/firestore";
import { S_getMultipleContactableUserDetails, S_getUserFromAllUsersList } from './user-profile-actions';
import * as admin from 'firebase-admin';

// Safe constructor for Conversation objects from Firestore data
const _docDataToConversation = (docSnap: DocumentSnapshot): Conversation => {
    const data = docSnap.data() || {};
    return {
        id: docSnap.id,
        participantIds: Array.isArray(data.participantIds) ? data.participantIds : [],
        participantDetails: data.participantDetails || {},
        lastMessageText: data.lastMessageText || "",
        lastMessageTimestamp: safeParseFirestoreTimestamp(data.lastMessageTimestamp),
        lastMessageSenderId: data.lastMessageSenderId || undefined,
        isGroupChat: typeof data.isGroupChat === 'boolean' ? data.isGroupChat : false,
        unreadCount: typeof data.unreadCount === 'number' ? data.unreadCount : 0,
        name: data.name || undefined,
        avatar: data.avatar || undefined,
        createdAt: safeParseFirestoreTimestamp(data.createdAt),
        updatedAt: safeParseFirestoreTimestamp(data.updatedAt),
    };
};


export async function S_getConversations(userId: string): Promise<Conversation[]> {
  if (!userId) return [];
  const db = getAdminFirestoreInstance();
  const conversationsCollection = db.collection("conversations");

  try {
    const q = conversationsCollection
        .where('participantIds', 'array-contains', userId)
        .orderBy('lastMessageTimestamp', 'desc');

    const querySnapshot = await q.get();
    if (querySnapshot.empty) return [];
    
    const conversations = querySnapshot.docs.map(doc => _docDataToConversation(doc));
    
    const conversationsNeedingDetails = conversations.filter(c => !c.isGroupChat && Object.keys(c.participantDetails).length < c.participantIds.length);
    if (conversationsNeedingDetails.length > 0) {
        const userIdsToFetch = new Set<string>();
        conversationsNeedingDetails.forEach(c => c.participantIds.forEach(id => userIdsToFetch.add(id)));
        const userDetailsMap = await S_getMultipleContactableUserDetails(Array.from(userIdsToFetch));

        conversations.forEach(convo => {
            if (!convo.isGroupChat && Object.keys(convo.participantDetails).length < convo.participantIds.length) {
                const newParticipantDetails: any = { ...convo.participantDetails };
                convo.participantIds.forEach(id => {
                    const user = userDetailsMap[id];
                    if (user && !newParticipantDetails[id]) {
                        newParticipantDetails[id] = { name: user.name, avatar: user.avatar };
                    }
                });
                convo.participantDetails = newParticipantDetails;
            }
        });
    }
    return conversations;
  } catch (error) {
    console.error(`Error S_getConversations:`, error);
    return [];
  }
}

export async function S_getMessages(conversationId: string, userId: string): Promise<ChatMessage[]> {
  if (!userId || !conversationId) return [];
  const db = getAdminFirestoreInstance();
  const conversationsCollection = db.collection("conversations");

  try {
    const convoDocRef = conversationsCollection.doc(conversationId);
    const convoDoc = await convoDocRef.get();
    if (!convoDoc.exists) return [];

    const convoData = _docDataToConversation(convoDoc);
    if (!convoData.participantIds.includes(userId)) return [];
    
    const messagesSnapshot = await convoDocRef.collection("messages").orderBy('timestamp', 'asc').get();
    return messagesSnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
            id: doc.id,
            conversationId: data.conversationId || conversationId,
            senderId: data.senderId || "unknown",
            senderName: data.senderName || "User",
            senderAvatar: data.senderAvatar,
            text: data.text || "",
            timestamp: safeParseFirestoreTimestamp(data.timestamp),
            createdAt: safeParseFirestoreTimestamp(data.createdAt),
            updatedAt: safeParseFirestoreTimestamp(data.updatedAt),
        } as ChatMessage;
    });
  } catch (error) {
    console.error(`Error S_getMessages:`, error);
    return [];
  }
}

export async function S_sendMessage(data: {
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
}): Promise<{ success: boolean; message?: ChatMessage | string }> {
  if (!data.conversationId || !data.senderId) return { success: false, message: "Invalid data." };
  const db = getAdminFirestoreInstance();
  const conversationsCollection = db.collection("conversations");

  const convoDocRef = conversationsCollection.doc(data.conversationId);
  try {
    const convoDoc = await convoDocRef.get();
    if (!convoDoc.exists) return { success: false, message: "Not found." };
    const convoData = _docDataToConversation(convoDoc);
    if (!convoData.participantIds.includes(data.senderId)) return { success: false, message: "Access denied." };

    const newMessageData: any = {
        conversationId: data.conversationId,
        senderId: data.senderId,
        senderName: data.senderName,
        senderAvatar: data.senderAvatar || `https://avatar.vercel.sh/${data.senderId}.png`,
        text: data.text,
        timestamp: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };

    const batch = db.batch();
    const newMessageRef = convoDocRef.collection("messages").doc();
    batch.set(newMessageRef, newMessageData);

    batch.update(convoDocRef, {
        lastMessageText: data.text,
        lastMessageTimestamp: FieldValue.serverTimestamp(),
        lastMessageSenderId: data.senderId,
        unreadCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();
    const now = new Date().toISOString();
    return { success: true, message: { ...newMessageData, id: newMessageRef.id, timestamp: now, createdAt: now, updatedAt: now } as ChatMessage };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function S_startConversation(
  currentUserId: string,
  otherUserId: string,
  otherUserName: string,
  otherUserAvatar: string
): Promise<{ success: boolean; conversation?: Conversation; isNew: boolean; message?: string; }> {
  if (!currentUserId || !otherUserId) return { success: false, isNew: false, message: "IDs missing." };
  const db = getAdminFirestoreInstance();
  const conversationsCollection = db.collection("conversations");
  
  const participantIdsSorted = [currentUserId, otherUserId].sort();
  const conversationId = participantIdsSorted.join('-');
  const convoDocRef = conversationsCollection.doc(conversationId);

  try {
    const convoDoc = await convoDocRef.get();
    if (convoDoc.exists) {
        return { success: true, conversation: _docDataToConversation(convoDoc), isNew: false };
    }

    const currentUserDetails = await S_getMultipleContactableUserDetails([currentUserId]);
    const currentUserName = currentUserDetails[currentUserId]?.name || "User";
    const currentUserAvatar = currentUserDetails[currentUserId]?.avatar || `https://avatar.vercel.sh/${currentUserId}.png`;
    const timestamp = FieldValue.serverTimestamp();
    
    const newConversationData: any = {
      id: conversationId,
      participantIds: participantIdsSorted,
      lastMessageText: "Conversation started.",
      lastMessageTimestamp: timestamp,
      lastMessageSenderId: currentUserId,
      isGroupChat: false,
      unreadCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      participantDetails: {
          [currentUserId]: { name: currentUserName, avatar: currentUserAvatar },
          [otherUserId]: { name: otherUserName, avatar: otherUserAvatar || `https://avatar.vercel.sh/${otherUserId}.png` }
      }
    };
    
    await convoDocRef.set(newConversationData);
    const now = new Date().toISOString();
    return { success: true, conversation: { ...newConversationData, lastMessageTimestamp: now, createdAt: now, updatedAt: now } as Conversation, isNew: true };
  } catch (error) {
    return { success: false, isNew: false, message: (error as Error).message };
  }
}

export async function S_markConversationAsRead(
  conversationId: string,
  userId: string
): Promise<{ success: boolean }> {
  if (!conversationId || !userId) return { success: false };
  const db = getAdminFirestoreInstance();
  const conversationsCollection = db.collection("conversations");

  try {
    const convoDoc = await conversationsCollection.doc(conversationId).get();
    if (convoDoc.exists) {
        const convoData = _docDataToConversation(convoDoc);
        if (convoData.participantIds.includes(userId) && convoData.lastMessageSenderId !== userId) {
            await conversationsCollection.doc(conversationId).update({ unreadCount: 0, updatedAt: FieldValue.serverTimestamp() });
        }
        return { success: true };
    }
    return { success: false };
  } catch (error) {
    return { success: false };
  }
}

export async function S_sendWelcomeMessage(targetUserId: string): Promise<{ success: boolean }> {
  const ownerUid = process.env.NEXT_PUBLIC_OWNER_UID;
  if (!ownerUid) return { success: false };
  const db = getAdminFirestoreInstance();
  const conversationsCollection = db.collection("conversations");

  try {
    const [targetUserDetails, ownerDetails] = await Promise.all([
        S_getUserFromAllUsersList(targetUserId),
        S_getUserFromAllUsersList(ownerUid)
    ]);
    if (!targetUserDetails || !ownerDetails) return { success: false };

    const participantIdsSorted = [ownerUid, targetUserId].sort();
    const conversationId = participantIdsSorted.join('-');
    const convoDocRef = conversationsCollection.doc(conversationId);
    
    const existing = await convoDocRef.get();
    if (existing.exists) return { success: true };

    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const welcomeText = `Welcome to **GroupHub**, ${targetUserDetails.name}! 🚀...`;

    const batch = db.batch();
    batch.set(convoDocRef, {
      id: conversationId,
      participantIds: participantIdsSorted,
      participantDetails: {
        [ownerUid]: { name: ownerDetails.name, avatar: ownerDetails.avatar },
        [targetUserId]: { name: targetUserDetails.name, avatar: targetUserDetails.avatar }
      },
      lastMessageText: welcomeText,
      lastMessageTimestamp: timestamp,
      lastMessageSenderId: ownerUid,
      isGroupChat: false,
      unreadCount: 1, 
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const msgRef = convoDocRef.collection("messages").doc();
    batch.set(msgRef, {
      id: msgRef.id,
      conversationId: conversationId,
      senderId: ownerUid, senderName: ownerDetails.name, senderAvatar: ownerDetails.avatar,
      text: welcomeText,
      timestamp: timestamp, createdAt: timestamp, updatedAt: timestamp,
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}
