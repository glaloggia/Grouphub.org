
'use server';

import { getAdminFirestoreInstance, safeParseFirestoreTimestamp } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { FriendRequest, ContactableUser } from "@/types";
import { S_getMultipleContactableUserDetails } from './user-profile-actions';
import * as admin from 'firebase-admin';

// Safe constructor for FriendRequest objects from Firestore data
const _docDataToFriendRequest = (docSnap: admin.firestore.DocumentSnapshot): FriendRequest => {
    const data = docSnap.data() || {};
    const validStatuses = ['pending', 'accepted', 'declined'];
    
    return {
        id: docSnap.id,
        fromUserId: data.fromUserId || 'unknown_user',
        fromUserName: data.fromUserName || 'Unknown User',
        fromUserAvatar: data.fromUserAvatar || undefined,
        toUserId: data.toUserId || 'unknown_user',
        status: validStatuses.includes(data.status) ? data.status : 'pending',
        timestamp: safeParseFirestoreTimestamp(data.timestamp),
    };
};

export async function S_sendFriendRequest(
  fromUserId: string,
  toUserId: string
): Promise<{ success: boolean; message?: string; request?: FriendRequest }> {
  if (fromUserId === toUserId) {
    return { success: false, message: "Cannot send friend request to yourself." };
  }

  const db = getAdminFirestoreInstance();
  const usersCollection = db.collection("users");
  const friendRequestsCollection = db.collection("friendRequests");

  // Check if users are already friends
  const fromUserDoc = await usersCollection.doc(fromUserId).get();
  const fromUserData = fromUserDoc.data();
  if (fromUserData && Array.isArray(fromUserData.friendIds) && fromUserData.friendIds.includes(toUserId)) {
    return { success: false, message: "You are already friends with this user." };
  }


  // Check for existing pending request (in either direction)
  const q1 = friendRequestsCollection.where('fromUserId', '==', fromUserId).where('toUserId', '==', toUserId).where('status', '==', 'pending');
  const q2 = friendRequestsCollection.where('fromUserId', '==', toUserId).where('toUserId', '==', fromUserId).where('status', '==', 'pending');
  
  const [req1Snap, req2Snap] = await Promise.all([q1.get(), q2.get()]);

  if (!req1Snap.empty) {
    return { success: false, message: "Friend request already sent." };
  }
  if (!req2Snap.empty) {
    return { success: false, message: "This user has already sent you a friend request. Please check your pending requests." };
  }
  
  const fromUserName = fromUserData?.name || "User";
  const fromUserAvatar = fromUserData?.avatar;

  const newRequestDataForFirestore: any = {
    fromUserId,
    fromUserName,
    toUserId,
    status: 'pending',
    timestamp: FieldValue.serverTimestamp(),
  };

  if (fromUserAvatar) {
    newRequestDataForFirestore.fromUserAvatar = fromUserAvatar;
  }

  const newRequestRef = await friendRequestsCollection.add(newRequestDataForFirestore);
  
  const createdRequest: FriendRequest = {
    id: newRequestRef.id,
    fromUserId,
    fromUserName,
    toUserId,
    status: 'pending',
    timestamp: new Date().toISOString()
  };

  if (fromUserAvatar) {
    createdRequest.fromUserAvatar = fromUserAvatar;
  }
  
  return { success: true, request: createdRequest };
}

export async function S_getPendingFriendRequests(userId: string): Promise<FriendRequest[]> {
  const db = getAdminFirestoreInstance();
  const friendRequestsCollection = db.collection("friendRequests");
  try {
    const q = friendRequestsCollection
      .where('toUserId', '==', userId)
      .where('status', '==', 'pending')
      .orderBy('timestamp', 'desc');
    
    const querySnapshot = await q.get();
    const requests: FriendRequest[] = [];
    querySnapshot.forEach(doc => {
      requests.push(_docDataToFriendRequest(doc));
    });
    return requests;
  } catch (error) {
    console.error(`[FriendActions - S_getPendingFriendRequests] Error for user ${userId}:`, error);
    return [];
  }
}

export async function S_respondToFriendRequest(
  requestId: string,
  respondingUserId: string,
  accept: boolean
): Promise<{ success: boolean; message?: string }> {
  const db = getAdminFirestoreInstance();
  const friendRequestsCollection = db.collection("friendRequests");
  const usersCollection = db.collection("users");
  const requestDocRef = friendRequestsCollection.doc(requestId);
  
  try {
    const requestDoc = await requestDocRef.get();

    if (!requestDoc.exists) {
      return { success: false, message: "Friend request not found." };
    }

    const request = _docDataToFriendRequest(requestDoc);
    if (request.toUserId !== respondingUserId) {
      return { success: false, message: "You are not authorized to respond to this request." };
    }
    if (request.status !== 'pending') {
      return { success: false, message: "This request has already been responded to."};
    }

    if (accept) {
      const fromUserRef = usersCollection.doc(request.fromUserId);
      const toUserRef = usersCollection.doc(request.toUserId);
      const timestamp = FieldValue.serverTimestamp();
      
      const batch = db.batch();
      // Use set with merge to safely update or create the document.
      batch.set(fromUserRef, { friendIds: FieldValue.arrayUnion(request.toUserId), updatedAt: timestamp }, { merge: true });
      batch.set(toUserRef, { friendIds: FieldValue.arrayUnion(request.fromUserId), updatedAt: timestamp }, { merge: true });
      batch.delete(requestDocRef);
      
      await batch.commit();
      return { success: true, message: "Friend request accepted." };
    } else { // Decline
      await requestDocRef.delete();
      return { success: true, message: "Friend request declined." };
    }
  } catch (error) {
      console.error("[FriendActions - S_respondToFriendRequest] Transactional error:", error);
      return { success: false, message: `Failed to respond to request. Firestore error: ${(error as Error).message}` };
  }
}

export async function S_cancelSentFriendRequest(
  requestId: string,
  currentUserId: string
): Promise<{ success: boolean; message?: string }> {
  const db = getAdminFirestoreInstance();
  const friendRequestsCollection = db.collection("friendRequests");
  const requestDocRef = friendRequestsCollection.doc(requestId);
  
  try {
    const requestDoc = await requestDocRef.get();
    
    if (!requestDoc.exists) {
      return { success: false, message: "Friend request not found." };
    }

    const request = _docDataToFriendRequest(requestDoc);
    if (request.fromUserId !== currentUserId) {
      return { success: false, message: "You can only cancel requests you sent." };
    }
    if (request.status !== 'pending') {
      return { success: false, message: "This request can no longer be cancelled." };
    }

    await requestDocRef.delete();
    return { success: true, message: "Friend request cancelled." };
  } catch (error) {
     console.error(`[FriendActions - S_cancelSentFriendRequest] Error for request ${requestId}:`, error);
    return { success: false, message: `Failed to cancel request. Firestore error: ${(error as Error).message}` };
  }
}

export async function S_cancelSentFriendRequestByRecipient(
  currentUserId: string,
  targetUserId: string
): Promise<{ success: boolean; message?: string }> {
  const db = getAdminFirestoreInstance();
  const friendRequestsCollection = db.collection("friendRequests");
  try {
    const q = friendRequestsCollection
      .where('fromUserId', '==', currentUserId)
      .where('toUserId', '==', targetUserId)
      .where('status', '==', 'pending')
      .limit(1);
    
    const querySnapshot = await q.get();

    if (querySnapshot.empty) {
      return { success: false, message: "No pending friend request found to cancel." };
    }
    
    const requestDoc = querySnapshot.docs[0];
    await requestDoc.ref.delete();

    return { success: true, message: "Friend request cancelled." };
  } catch (error) {
     const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
     console.error(`[FriendActions - S_cancelSentFriendRequestByRecipient] Error for user ${currentUserId} to ${targetUserId}:`, error);
     return { success: false, message: `Failed to cancel request. Firestore error: ${errorMessage}` };
  }
}

export async function S_getUserFriends(userId: string): Promise<ContactableUser[]> {
  const db = getAdminFirestoreInstance();
  const usersCollection = db.collection("users");
  try {
    const userDoc = await usersCollection.doc(userId).get();
    if (!userDoc.exists) {
      return [];
    }
    const userData = userDoc.data();
    const friendIds: string[] = Array.isArray(userData?.friendIds) ? userData.friendIds : [];

    if (friendIds.length === 0) {
      return [];
    }
    
    const friendDetailsMap = await S_getMultipleContactableUserDetails(friendIds);
    return Object.values(friendDetailsMap).sort((a,b) => (a?.name || '').localeCompare(b?.name || ''));

  } catch (error) {
    console.error(`[FriendActions - S_getUserFriends] Error for user ${userId}:`, error);
    return [];
  }
}

export async function S_unfriend(
  currentUserId: string,
  friendToUnfriendId: string
): Promise<{ success: boolean; message?: string }> {
  if (currentUserId === friendToUnfriendId) {
    return { success: false, message: "Cannot unfriend yourself." };
  }

  const db = getAdminFirestoreInstance();
  const usersCollection = db.collection("users");
  const currentUserRef = usersCollection.doc(currentUserId);
  const friendToRemoveRef = usersCollection.doc(friendToUnfriendId);
  const timestamp = FieldValue.serverTimestamp();
  
  try {
    await db.runTransaction(async (transaction) => {
        const currentUserDoc = await transaction.get(currentUserRef);
        const friendToRemoveDoc = await transaction.get(friendToRemoveRef);
        
        if (currentUserDoc.exists) {
            transaction.update(currentUserRef, { friendIds: FieldValue.arrayRemove(friendToUnfriendId), updatedAt: timestamp });
        }
        if (friendToRemoveDoc.exists) {
            transaction.update(friendToRemoveRef, { friendIds: FieldValue.arrayRemove(currentUserId), updatedAt: timestamp });
        }
    });
    return { success: true, message: "Unfriended successfully." };
  } catch (error) {
    console.error(`[FriendActions - S_unfriend] Transaction error between ${currentUserId} and ${friendToUnfriendId}:`, error);
    return { success: false, message: `Failed to unfriend. Firestore error: ${(error as Error).message}` };
  }
}

export async function S_getFriendshipStatus(
  currentUserId: string,
  targetUserId: string
): Promise<'friends' | 'request_sent' | 'request_received' | 'not_friends'> {
  if (currentUserId === targetUserId) return 'not_friends';

  const db = getAdminFirestoreInstance();
  const usersCollection = db.collection("users");
  const friendRequestsCollection = db.collection("friendRequests");

  try {
    const currentUserDoc = await usersCollection.doc(currentUserId).get();
    const userData = currentUserDoc.data();
    if (currentUserDoc.exists && Array.isArray(userData?.friendIds) && userData.friendIds.includes(targetUserId)) {
      return 'friends';
    }

    const sentReqQuery = friendRequestsCollection
      .where('fromUserId', '==', currentUserId)
      .where('toUserId', '==', targetUserId)
      .where('status', '==', 'pending');
    const sentReqSnap = await sentReqQuery.get();
    if (!sentReqSnap.empty) {
      return 'request_sent';
    }

    const receivedReqQuery = friendRequestsCollection
      .where('fromUserId', '==', targetUserId)
      .where('toUserId', '==', currentUserId)
      .where('status', '==', 'pending');
    const receivedReqSnap = await receivedReqQuery.get();
    if (!receivedReqSnap.empty) {
      return 'request_received';
    }

    return 'not_friends';
  } catch (error) {
    console.error(`[FriendActions - S_getFriendshipStatus] Error between ${currentUserId} and ${targetUserId}:`, error);
    return 'not_friends'; // Default to a safe state on error
  }
}
