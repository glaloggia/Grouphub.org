
'use server';

import { getAdminAuthInstance, getAdminFirestoreInstance } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { AdminUserView, Group } from '@/types';
import type { UserRecord } from "firebase-admin/auth";
import { getAllGroups } from "./group-actions";

// Helper function to check if a user is the app owner
function isAppOwner(userId: string): boolean {
    const ownerUid = process.env.NEXT_PUBLIC_OWNER_UID;
    if (!ownerUid) {
        console.warn("[Admin Actions] NEXT_PUBLIC_OWNER_UID environment variable is not set. Admin actions are disabled.");
        return false;
    }
    return userId === ownerUid;
}

export async function S_getAllUsersForAdmin(currentUserId: string): Promise<{ users?: AdminUserView[], error?: string }> {
    if (!isAppOwner(currentUserId)) {
        return { error: "Permission denied. You are not authorized for this action." };
    }

    const auth = getAdminAuthInstance();
    try {
        const [listUsersResult, allGroups] = await Promise.all([
            auth.listUsers(1000), // Get up to 1000 users
            getAllGroups()
        ]);

        const groupsByUserId = new Map<string, { id: string; name: string; }[]>();

        allGroups.forEach(group => {
            if (group.memberIds && Array.isArray(group.memberIds)) {
                group.memberIds.forEach(memberId => {
                    if (!groupsByUserId.has(memberId)) {
                        groupsByUserId.set(memberId, []);
                    }
                    groupsByUserId.get(memberId)!.push({ id: group.id, name: group.name });
                });
            }
        });

        const users = listUsersResult.users.map((userRecord: UserRecord): AdminUserView => ({
            uid: userRecord.uid,
            email: userRecord.email,
            displayName: userRecord.displayName,
            photoURL: userRecord.photoURL,
            disabled: userRecord.disabled,
            creationTime: userRecord.metadata.creationTime,
            lastSignInTime: userRecord.metadata.lastSignInTime,
            groups: groupsByUserId.get(userRecord.uid) || [],
        }));

        return { users };
    } catch (error) {
        console.error("[S_getAllUsersForAdmin] Error listing users:", error);
        return { error: `Failed to list users: ${(error as Error).message}` };
    }
}


export async function S_updateUserByAdmin(
    currentUserId: string,
    targetUid: string,
    updates: { displayName?: string; email?: string; disabled?: boolean }
): Promise<{ success: boolean; message?: string }> {
     if (!isAppOwner(currentUserId)) {
        return { success: false, message: "Permission denied. You are not authorized for this action." };
    }
    if (targetUid === currentUserId) {
        return { success: false, message: "Action not allowed. App owner cannot modify their own account through this panel." };
    }
    
    const auth = getAdminAuthInstance();
    const db = getAdminFirestoreInstance();

    try {
        await auth.updateUser(targetUid, updates);

        const userDocRef = db.collection('users').doc(targetUid);
        const firestoreUpdates: { [key: string]: any } = { updatedAt: FieldValue.serverTimestamp() };
        if (updates.displayName) {
            firestoreUpdates.name = updates.displayName;
        }
        if (updates.email) {
            firestoreUpdates.email = updates.email;
        }
        
        await userDocRef.set(firestoreUpdates, { merge: true });

        return { success: true, message: "User updated successfully." };

    } catch (error) {
        console.error(`[S_updateUserByAdmin] Error updating user ${targetUid}:`, error);
        return { success: false, message: `Failed to update user: ${(error as Error).message}` };
    }
}


export async function S_deleteUserByAdmin(
    currentUserId: string,
    targetUid: string
): Promise<{ success: boolean; message?: string }> {
     if (!isAppOwner(currentUserId)) {
        return { success: false, message: "Permission denied. You are not authorized for this action." };
    }
    if (targetUid === currentUserId) {
        return { success: false, message: "Action not allowed. App owner cannot delete their own account." };
    }

    const auth = getAdminAuthInstance();
    const db = getAdminFirestoreInstance();

    try {
        // First, delete from Firestore to trigger any necessary cleanup or logging
        const userProfileRef = db.collection('users').doc(targetUid);
        await userProfileRef.delete();
        
        // Then, delete the user from Firebase Authentication
        await auth.deleteUser(targetUid);

        return { success: true, message: `User ${targetUid} deleted successfully.` };
    } catch (error) {
        console.error(`[S_deleteUserByAdmin] Error deleting user ${targetUid}:`, error);
        return { success: false, message: `Failed to delete user: ${(error as Error).message}` };
    }
}


export async function cleanupDeletedUsersFromGroups(currentUserId: string): Promise<{ success: boolean; message: string; cleanedGroupsCount: number; removedMembersCount: number; }> {
    const db = getAdminFirestoreInstance();
    
    if (!isAppOwner(currentUserId)) {
        return { success: false, message: "Permission denied. Only the app owner can run this cleanup.", cleanedGroupsCount: 0, removedMembersCount: 0 };
    }
    console.log(`[Admin Cleanup] Starting cleanup process triggered by app owner: ${currentUserId}`);

    let cleanedGroupsCount = 0;
    let removedMembersCount = 0;

    try {
        // Step 1: Fetch all existing user IDs from the 'users' collection once.
        const usersSnapshot = await db.collection('users').select().get();
        const existingUserIds = new Set(usersSnapshot.docs.map(doc => doc.id));

        const groupsSnapshot = await db.collection('groups').get();
        
        if (groupsSnapshot.empty) {
            return { success: true, message: "No groups found to clean.", cleanedGroupsCount: 0, removedMembersCount: 0 };
        }

        let writeBatch = db.batch();
        let operationsInBatch = 0;

        for (const groupDoc of groupsSnapshot.docs) {
            const group = groupDoc.data();
            const memberIds: string[] = (Array.isArray(group.memberIds) ? group.memberIds : []).filter(uid => typeof uid === 'string' && uid.length > 0);
            
            if (memberIds.length === 0) {
                continue;
            }

            // Step 2: Find members to remove by checking against the in-memory Set. This is very fast.
            const membersToRemove = memberIds.filter(id => !existingUserIds.has(id));

            if (membersToRemove.length > 0) {
                const adminIds: string[] = (Array.isArray(group.adminIds) ? group.adminIds : []).filter(uid => typeof uid === 'string' && uid.length > 0);
                
                console.log(`[Admin Cleanup] In group '${group.name || 'Unnamed Group'}' (ID: ${groupDoc.id}), found ${membersToRemove.length} deleted users to remove:`, membersToRemove);
                
                const updatePayload: { [key: string]: any } = {
                    memberIds: FieldValue.arrayRemove(...membersToRemove)
                };
                
                // Also remove them from the admin list if they were an admin
                const adminsToRemove = adminIds.filter(id => membersToRemove.includes(id));
                if (adminsToRemove.length > 0) {
                    updatePayload.adminIds = FieldValue.arrayRemove(...adminsToRemove);
                }

                // Add the update operation to the batch
                writeBatch.update(groupDoc.ref, updatePayload);
                operationsInBatch++;
                
                cleanedGroupsCount++;
                removedMembersCount += membersToRemove.length;

                // Firestore batches have a limit of 500 operations. Commit and start a new batch if we're near the limit.
                if (operationsInBatch >= 499) {
                    await writeBatch.commit();
                    writeBatch = db.batch();
                    operationsInBatch = 0;
                }
            }
        }

        // Commit any remaining writes in the batch.
        if (operationsInBatch > 0) {
            await writeBatch.commit();
        }
        
        const message = `Cleanup complete. Scanned ${existingUserIds.size} users and ${groupsSnapshot.size} groups. Found and removed ${removedMembersCount} deleted members from ${cleanedGroupsCount} groups.`;
        console.log(`[Admin Cleanup] ${message}`);
        return { success: true, message, cleanedGroupsCount, removedMembersCount };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error("[Admin Cleanup] Error during cleanup process:", error);
        return { success: false, message: `Cleanup failed: ${errorMessage}`, cleanedGroupsCount: 0, removedMembersCount: 0 };
    }
}

export async function S_broadcastMessageToAllGroups(
    currentUserId: string,
    messageText: string
): Promise<{ success: boolean; message: string; groupCount: number }> {
    if (!isAppOwner(currentUserId)) {
        return { success: false, message: "Permission denied.", groupCount: 0 };
    }

    if (!messageText.trim()) {
        return { success: false, message: "Message cannot be empty.", groupCount: 0 };
    }

    const db = getAdminFirestoreInstance();
    const auth = getAdminAuthInstance();

    try {
        const ownerRecord = await auth.getUser(currentUserId);
        const ownerName = ownerRecord.displayName || "Administrator";
        const ownerAvatar = ownerRecord.photoURL || `https://avatar.vercel.sh/${currentUserId}.png`;

        const groupsSnapshot = await db.collection('groups').get();
        if (groupsSnapshot.empty) {
            return { success: true, message: "No groups found to broadcast to.", groupCount: 0 };
        }

        let totalGroupsNotified = 0;
        const timestamp = FieldValue.serverTimestamp();

        // Process in batches due to Firestore limits
        let batch = db.batch();
        let ops = 0;

        for (const groupDoc of groupsSnapshot.docs) {
            const messageRef = groupDoc.ref.collection('messages').doc();
            
            // 1. Add the broadcast message to the group
            batch.set(messageRef, {
                groupId: groupDoc.id,
                senderId: currentUserId,
                senderName: `${ownerName} (Announcement)`,
                senderAvatar: ownerAvatar,
                text: messageText,
                timestamp: timestamp
            });
            ops++;

            // 2. Update group updatedAt to trigger notification logic
            batch.update(groupDoc.ref, { updatedAt: timestamp });
            ops++;

            totalGroupsNotified++;

            if (ops >= 450) { // Safety margin for 500 limit
                await batch.commit();
                batch = db.batch();
                ops = 0;
            }
        }

        if (ops > 0) {
            await batch.commit();
        }

        return { 
            success: true, 
            message: `Announcement successfully sent to ${totalGroupsNotified} groups.`, 
            groupCount: totalGroupsNotified 
        };

    } catch (error) {
        console.error("[Broadcast] Error during global announcement:", error);
        return { 
            success: false, 
            message: `Failed to broadcast message: ${error instanceof Error ? error.message : String(error)}`, 
            groupCount: 0 
        };
    }
}
