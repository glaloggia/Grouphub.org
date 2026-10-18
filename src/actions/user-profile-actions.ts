
'use server';

import { getAdminAuthInstance, getAdminFirestoreInstance, getAdminStorageInstance, verifyIdTokenAndGetUid, safeParseFirestoreTimestamp } from "@/lib/firebase-admin";
import type { ContactableUser, Group as StoredGroup } from "@/types";
import { Buffer } from 'buffer';
import { FieldValue, FieldPath } from "firebase-admin/firestore";

interface UserProfileServerData {
  bio?: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  interests?: string[];
}

const getUsernameFromEmail = (email?: string): string => {
  if (!email) return "User";
  const namePart = email.split('@')[0];
  return namePart.charAt(0).toUpperCase() + namePart.slice(1);
};

const getDefaultVercelAvatar = (identifier: string | null | undefined): string => {
    const textIdentifier = identifier || 'User';
    const firstChar = (textIdentifier.charAt(0) || 'U').toUpperCase();
    return `https://avatar.vercel.sh/${encodeURIComponent(textIdentifier)}.png?text=${firstChar}`;
};

export async function getUserProfile(userId: string): Promise<UserProfileServerData | null> {
  const db = getAdminFirestoreInstance();
  try {
    const userDocRef = db.collection("users").doc(userId);
    const userDocSnap = await userDocRef.get();

    if (userDocSnap.exists) {
      const data = userDocSnap.data()!;
      const userName = data.name || getUsernameFromEmail(data.email) || `User_${userId.substring(0,4)}`;
      return {
        bio: data.bio || "",
        avatarUrl: data.avatar || data.avatarUrl || getDefaultVercelAvatar(userName || userId),
        createdAt: safeParseFirestoreTimestamp(data.createdAt),
        updatedAt: safeParseFirestoreTimestamp(data.updatedAt),
        interests: data.interests || [],
      };
    }
    return null;
  } catch (error) {
    console.error(`[UserProfileActions - getUserProfile] Error fetching user profile from Firestore for userId ${userId}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Firebase Admin SDK getUserProfile error: ${errorMessage}`);
  }
}

export async function updateUserProfile(
  userId: string,
  data: {
    idToken: string;
    bio?: string;
    avatarUrl?: string | null;
    displayName?: string;
    interests?: string[];
  }
): Promise<{ success: boolean; message?: string; updatedProfile?: UserProfileServerData; updatedContactableUser?: Pick<ContactableUser, 'id' | 'name' | 'avatar' | 'email' | 'interests'> }> {
  let verifiedUid: string;
  try {
    verifiedUid = await verifyIdTokenAndGetUid(data.idToken);
    if (verifiedUid !== userId) {
      return { success: false, message: "Authorization error: ID token does not match target user." };
    }
  } catch (error) {
    return { success: false, message: `Authentication failed: ${(error as Error).message}` };
  }

  const adminAuth = getAdminAuthInstance();
  const db = getAdminFirestoreInstance();
  const userRecord = await adminAuth.getUser(verifiedUid);
  const userDocRef = db.collection("users").doc(verifiedUid);
  
  const firestoreUpdateData: any = {
      updatedAt: FieldValue.serverTimestamp(),
  };
  const authUpdateData: { displayName?: string; photoURL?: string | null } = {};

  try {
    // Handle display name update
    if (data.displayName !== undefined && data.displayName !== userRecord.displayName) {
        firestoreUpdateData.name = data.displayName;
        authUpdateData.displayName = data.displayName;
    }

    // Handle bio update
    if (data.bio !== undefined) {
        firestoreUpdateData.bio = data.bio;
    }

    // Handle interests update
    if (data.interests !== undefined) {
        firestoreUpdateData.interests = data.interests;
    }
    
    // Handle avatar update
    if (data.avatarUrl !== undefined) {
      const storage = getAdminStorageInstance();
      const bucket = storage.bucket();

      // Delete old avatar from Storage if it exists
      if (userRecord.photoURL && userRecord.photoURL.startsWith('https://storage.googleapis.com')) {
        try {
            const oldFileUrl = new URL(userRecord.photoURL);
            const bucketName = bucket.name;
            const pathStartIndex = oldFileUrl.pathname.indexOf(bucketName) + bucketName.length + 1;
            const oldFilePath = decodeURIComponent(oldFileUrl.pathname.substring(pathStartIndex));

            if (oldFilePath) {
                await bucket.file(oldFilePath).delete();
            }
        } catch (deleteError: any) {
            if (deleteError.code !== 404) {
               console.warn(`Could not delete old avatar, continuing...`, deleteError);
            }
        }
      }

      if (data.avatarUrl && data.avatarUrl.startsWith('data:image')) {
        // Upload new avatar
        const matches = data.avatarUrl.match(/^data:(.+);base64,(.+)$/);
        if (!matches) throw new Error("Invalid image data URI format.");
        
        const buffer = Buffer.from(matches[2], 'base64');
        const filePath = `avatars/${verifiedUid}/profile.jpg`; // Consistent path
        const file = bucket.file(filePath);

        await file.save(buffer, { metadata: { contentType: matches[1] } });
        await file.makePublic();
        const newPublicUrl = file.publicUrl();

        authUpdateData.photoURL = newPublicUrl;
        firestoreUpdateData.avatarUrl = newPublicUrl;
        firestoreUpdateData.avatar = newPublicUrl;
      } else if (data.avatarUrl === null) { 
        // Remove avatar
        authUpdateData.photoURL = null;
        firestoreUpdateData.avatarUrl = null;
        const nameForAvatar = data.displayName || userRecord.displayName;
        firestoreUpdateData.avatar = getDefaultVercelAvatar(nameForAvatar || verifiedUid);
      }
    }
    
    // Perform updates if there's anything to update
    if (Object.keys(authUpdateData).length > 0) {
      await adminAuth.updateUser(verifiedUid, authUpdateData);
    }
    if (Object.keys(firestoreUpdateData).length > 0) {
      await userDocRef.set(firestoreUpdateData, { merge: true });
    }

    // Refetch final state to return
    const finalUserRecord = await adminAuth.getUser(verifiedUid);
    const finalDocSnap = await userDocRef.get();
    const finalDocData = finalDocSnap.data() || {};
      
    return {
        success: true,
        updatedProfile: { 
            bio: finalDocData.bio || "", 
            avatarUrl: finalDocData.avatar || finalDocData.avatarUrl || "",
            createdAt: safeParseFirestoreTimestamp(finalDocData.createdAt),
            updatedAt: safeParseFirestoreTimestamp(finalDocData.updatedAt),
            interests: finalDocData.interests || [],
        },
        updatedContactableUser: {
            id: verifiedUid,
            name: finalUserRecord.displayName || getUsernameFromEmail(finalUserRecord.email),
            avatar: finalDocData.avatar || finalUserRecord.photoURL || getDefaultVercelAvatar(verifiedUid),
            email: finalUserRecord.email,
            interests: finalDocData.interests || [],
        }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Failed to update profile: ${errorMessage}` };
  }
}

export async function S_updateUserInAllUsersList(
  userId: string,
  nameInput: string | null | undefined,
  authPhotoURL: string | null | undefined,
  email?: string | null
) {
  const db = getAdminFirestoreInstance();
  // Robustly handle missing name or email to create a fallback display name.
  const displayName = nameInput || (email ? getUsernameFromEmail(email) : `User_${userId.substring(0,4)}`);
  
  // Ensure that a valid identifier is passed to the avatar generator.
  const identifierForAvatar = displayName || userId;
  const displayAvatar = authPhotoURL || getDefaultVercelAvatar(identifierForAvatar);

  try {
    const userDocRef = db.collection("users").doc(userId);
    const docSnap = await userDocRef.get();
    const timestamp = FieldValue.serverTimestamp();

    const userData: any = {
      id: userId,
      name: displayName,
      avatar: displayAvatar,
      avatarUrl: displayAvatar,
      updatedAt: timestamp,
    };
    if (email) userData.email = email;

    // For new users, ensure the friendIds and interests arrays are initialized and set createdAt
    if (!docSnap.exists || !docSnap.data()?.hasOwnProperty('friendIds')) {
      userData.friendIds = [];
      userData.interests = [];
      if (!docSnap.exists) {
        userData.createdAt = timestamp;
      }
    }

    await userDocRef.set(userData, { merge: true });
  } catch (error) {
    console.error(`[UserProfileActions - S_updateUserInAllUsersList] CRITICAL Error for ${userId} in Firestore:`, error);
  }
}

export async function S_getUserFromAllUsersList(userId: string): Promise<Pick<ContactableUser, 'id' | 'name' | 'avatar' | 'email' | 'interests'> | null> {
  const db = getAdminFirestoreInstance();
  try {
    const userDocSnap = await db.collection("users").doc(userId).get();

    if (userDocSnap.exists) {
      const data = userDocSnap.data() || {};
      const userName = data.name || getUsernameFromEmail(data.email) || `User_${userId.substring(0,4)}`;
      return {
        id: data.id || userId,
        name: userName,
        avatar: data.avatar || data.avatarUrl || getDefaultVercelAvatar(userName || userId),
        email: data.email,
        interests: data.interests || [],
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

export async function S_getMultipleContactableUserDetails(userIds: string[]): Promise<Record<string, Pick<ContactableUser, 'id' | 'name' | 'avatar' | 'email' | 'interests'>>> {
  const db = getAdminFirestoreInstance();
  const result: Record<string, Pick<ContactableUser, 'id' | 'name' | 'avatar' | 'email' | 'interests'>> = {};

  if (!userIds || userIds.length === 0) return result;
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueUserIds.length === 0) return result;

  try {
    const MAX_IDS_PER_QUERY = 30;
    const chunks: string[][] = [];
    for (let i = 0; i < uniqueUserIds.length; i += MAX_IDS_PER_QUERY) {
      chunks.push(uniqueUserIds.slice(i, i + MAX_IDS_PER_QUERY));
    }

    await Promise.all(chunks.map(async (chunk) => {
        if (chunk.length === 0) return;
        const querySnapshot = await db.collection("users").where(FieldPath.documentId(), 'in', chunk).get();
        querySnapshot.forEach((docSnap) => {
            if (docSnap.exists) {
                const data = docSnap.data() || {};
                const userName = data.name || getUsernameFromEmail(data.email) || `User_${docSnap.id.substring(0,4)}`;
                result[docSnap.id] = {
                    id: docSnap.id,
                    name: userName,
                    avatar: data.avatar || data.avatarUrl || getDefaultVercelAvatar(userName || docSnap.id),
                    email: data.email,
                    interests: data.interests || [],
                };
            }
        });
    }));
    
    uniqueUserIds.forEach(id => {
      if (!result[id]) {
        result[id] = {
          id: id,
          name: `User_${id.substring(0,4)}`,
          avatar: getDefaultVercelAvatar(id),
          email: undefined,
          interests: [],
        };
      }
    });

  } catch (error) {
    console.error('[UserProfileActions - S_getMultipleContactableUserDetails] Error fetching users:', error);
    // Fallback for all requested IDs on error to prevent crashes downstream
    uniqueUserIds.forEach(id => {
      if (!result[id]) {
        result[id] = { id: id, name: `User ${id.substring(0,4)}`, avatar: getDefaultVercelAvatar(id), email: undefined, interests: [] };
      }
    });
  }
  return result;
}

export async function S_deleteUserAndData(idToken: string): Promise<{ success: boolean; message?: string }> {
  let verifiedUid: string;
  try {
    verifiedUid = await verifyIdTokenAndGetUid(idToken);
  } catch (error) {
    return { success: false, message: `Authentication failed: ${(error as Error).message}` };
  }
  
  const adminAuth = getAdminAuthInstance();
  const db = getAdminFirestoreInstance();
  const timestamp = FieldValue.serverTimestamp();
  
  try {
    const batch = db.batch();
    const userProfileRef = db.collection('users').doc(verifiedUid);
    const userProfileSnap = await userProfileRef.get();

    // Clean up friends lists
    if (userProfileSnap.exists) {
        const userData = userProfileSnap.data();
        const friendIds: string[] = Array.isArray(userData?.friendIds) ? userData.friendIds : [];
        if (friendIds.length > 0) {
            const friendIdChunks: string[][] = [];
            for (let i = 0; i < friendIds.length; i += 30) {
                friendIdChunks.push(friendIds.slice(i, i + 30));
            }
            for (const chunk of friendIdChunks) {
                if (chunk.length === 0) continue;
                const friendDocs = await db.collection('users').where(FieldPath.documentId(), 'in', chunk).get();
                friendDocs.forEach(friendDoc => {
                    batch.update(friendDoc.ref, { 
                        friendIds: FieldValue.arrayRemove(verifiedUid),
                        updatedAt: timestamp,
                    });
                });
            }
        }
    }


    // Find all groups the user is a member of and remove them
    const groupsQuery = db.collection('groups').where('memberIds', 'array-contains', verifiedUid);
    const groupsSnapshot = await groupsQuery.get();

    groupsSnapshot.forEach(doc => {
      // A more robust app would handle group ownership transfer or deletion if the user is the creator.
      // For now, we just remove them from member/admin lists. The creatorId remains, creating an orphaned group.
      batch.update(doc.ref, {
        memberIds: FieldValue.arrayRemove(verifiedUid),
        adminIds: FieldValue.arrayRemove(verifiedUid),
        updatedAt: timestamp,
      });
    });

    // Delete the user's profile from the 'users' collection
    batch.delete(userProfileRef);
    
    // Commit Firestore changes
    await batch.commit();

    // Delete the user from Firebase Authentication
    await adminAuth.deleteUser(verifiedUid);

    // Delete user's avatar from storage
    const storage = getAdminStorageInstance();
    const bucket = storage.bucket();
    const avatarFilePath = `avatars/${verifiedUid}/profile.jpg`;
    const file = bucket.file(avatarFilePath);
    try {
        await file.delete();
    } catch(error: any) {
        if (error.code !== 404) { // Ignore if file doesn't exist
            console.warn(`[UserProfileActions] Could not delete avatar for user ${verifiedUid}, but continuing.`, error);
        }
    }

    return { success: true, message: 'Account deleted successfully.' };
  } catch (error) {
    console.error(`[UserProfileActions - S_deleteUserAndData] Error deleting user ${verifiedUid}:`, error);
    return { success: false, message: `Failed to delete account: ${(error as Error).message}` };
  }
}
