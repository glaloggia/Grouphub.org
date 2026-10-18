'use server';

import { getAdminFirestoreInstance, safeParseFirestoreTimestamp } from "@/lib/firebase-admin";
import type { GroupMessage } from '@/types';
import { FieldValue, type DocumentSnapshot } from "firebase-admin/firestore";
import * as admin from 'firebase-admin';

const _docDataToGroupMessage = (doc: DocumentSnapshot): GroupMessage => {
    const data = doc.data() || {};
    return {
        id: doc.id,
        groupId: data.groupId || '',
        senderId: data.senderId || 'unknown_sender',
        senderName: data.senderName || 'Unknown User',
        senderAvatar: data.senderAvatar,
        text: data.text || '',
        timestamp: safeParseFirestoreTimestamp(data.timestamp),
    };
};

export async function S_getMessagesForGroup(groupId: string): Promise<GroupMessage[]> {
    const db = getAdminFirestoreInstance();
    const groupsCollection = db.collection("groups");

    try {
        const groupDoc = await groupsCollection.doc(groupId).get();
        if (!groupDoc.exists) return [];
        
        const messagesSnapshot = await groupsCollection.doc(groupId).collection("messages").orderBy("timestamp", "asc").get();
        return messagesSnapshot.docs.map(_docDataToGroupMessage);
    } catch (error) {
        console.error(`[GroupMessageActions] Error:`, error);
        return [];
    }
}

interface PostMessageData {
    groupId: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    text: string;
}

export async function S_postMessageToGroup(data: PostMessageData): Promise<{ success: boolean, message?: string, groupMessage?: GroupMessage }> {
    const db = getAdminFirestoreInstance();
    const groupsCollection = db.collection("groups");

    const { groupId, senderId, text } = data;
    try {
        if (!text.trim()) return { success: false, message: "Empty text." };

        const groupDocRef = groupsCollection.doc(groupId);
        const groupDoc = await groupDocRef.get();
        if (!groupDoc.exists) return { success: false, message: "Not found." };
        
        const groupData = groupDoc.data()!;
        if (!Array.isArray(groupData.memberIds) || !groupData.memberIds.includes(senderId)) {
            return { success: false, message: "Not member." };
        }

        const newMessageData: any = {
            groupId, senderId, senderName: data.senderName, text: text.trim(),
            timestamp: FieldValue.serverTimestamp(),
        };
        if (data.senderAvatar) newMessageData.senderAvatar = data.senderAvatar;

        const newMessageRef = await groupDocRef.collection("messages").add(newMessageData);
        await groupDocRef.update({ updatedAt: FieldValue.serverTimestamp() });
        
        const now = new Date().toISOString();
        const createdMessage: GroupMessage = {
            ...newMessageData,
            id: newMessageRef.id,
            timestamp: now,
        };

        return { success: true, groupMessage: createdMessage };
    } catch (error) {
        return { success: false, message: (error as Error).message };
    }
}
