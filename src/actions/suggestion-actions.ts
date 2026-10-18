
'use server';

import type { ContactableUser } from '@/types';
import { getAdminFirestoreInstance } from '@/lib/firebase-admin';
import { S_getUserFromAllUsersList } from './user-profile-actions';
import { S_getMemberGroups } from './group-actions';
import * as admin from 'firebase-admin';

interface Suggestion extends ContactableUser {
  reason: string;
  score: number;
}

/**
 * Utility to shuffle an array (Fisher-Yates)
 */
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Optimized friend suggestions with randomness.
 * Tries to find people in the same groups, then by shared interests, then by recent activity.
 */
export async function getFriendSuggestions(userId: string): Promise<Suggestion[]> {
  try {
    const db = getAdminFirestoreInstance();
    const usersCollection = db.collection('users');

    const currentUser = await S_getUserFromAllUsersList(userId);
    if (!currentUser) return [];

    const userDoc = await usersCollection.doc(userId).get();
    const userData = userDoc.data();
    const currentUserFriendIds = new Set(userData?.friendIds || []);
    const currentUserInterests = new Set(currentUser.interests || []);

    const potentialSuggestions: Map<string, { user: ContactableUser, mutualGroups: Set<string>, mutualInterests: Set<string> }> = new Map();

    // 1. Find mutual groups members (High priority)
    // We fetch groups and then parallelize the member lookups for speed
    let currentUserGroups = await S_getMemberGroups(userId);
    currentUserGroups = shuffleArray(currentUserGroups).slice(0, 5); // Limit to first 5 groups for dashboard speed

    const groupMembersPromises = currentUserGroups.map(async (group) => {
        const memberIds = (group.memberIds || []).filter(id => id !== userId && !currentUserFriendIds.has(id));
        
        let memberSample = memberIds;
        if (memberIds.length > 20) {
            memberSample = shuffleArray(memberIds).slice(0, 20);
        }

        if (memberSample.length > 0) {
            const usersSnapshot = await usersCollection.where(admin.firestore.FieldPath.documentId(), 'in', memberSample).get();
            return { groupName: group.name, docs: usersSnapshot.docs };
        }
        return { groupName: group.name, docs: [] };
    });

    const groupMembersResults = await Promise.all(groupMembersPromises);

    groupMembersResults.forEach(({ groupName, docs }) => {
        docs.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            
            if (!potentialSuggestions.has(id)) {
                potentialSuggestions.set(id, {
                    user: {
                        id,
                        name: data.name || "User",
                        avatar: data.avatar || `https://avatar.vercel.sh/${id}.png`,
                        interests: Array.isArray(data.interests) ? data.interests : [],
                    },
                    mutualGroups: new Set(),
                    mutualInterests: new Set()
                });
            }
            potentialSuggestions.get(id)!.mutualGroups.add(groupName);
        });
    });

    // 2. Fallback: Shared Interests (Medium priority) - only if we have few suggestions
    if (potentialSuggestions.size < 10 && currentUserInterests.size > 0) {
        const interestsArray = shuffleArray(Array.from(currentUserInterests));
        const interestSnapshot = await usersCollection
            .where('interests', 'array-contains-any', interestsArray.slice(0, 10))
            .limit(20)
            .get();

        interestSnapshot.docs.forEach(doc => {
            const id = doc.id;
            if (id === userId || currentUserFriendIds.has(id) || potentialSuggestions.has(id)) return;

            const data = doc.data();
            potentialSuggestions.set(id, {
                user: {
                    id,
                    name: data.name || "User",
                    avatar: data.avatar || `https://avatar.vercel.sh/${id}.png`,
                    interests: Array.isArray(data.interests) ? data.interests : [],
                },
                mutualGroups: new Set(),
                mutualInterests: new Set()
            });
        });
    }

    // 3. Last Fallback: Active users (Low priority) - only if still few
    if (potentialSuggestions.size < 5) {
        const recentSnapshot = await usersCollection
            .orderBy('updatedAt', 'desc')
            .limit(20)
            .get();

        recentSnapshot.docs.forEach(doc => {
            const id = doc.id;
            if (id === userId || currentUserFriendIds.has(id) || potentialSuggestions.has(id)) return;
            
            const data = doc.data();
            potentialSuggestions.set(id, {
                user: {
                    id,
                    name: data.name || "User",
                    avatar: data.avatar || `https://avatar.vercel.sh/${id}.png`,
                    interests: Array.isArray(data.interests) ? data.interests : [],
                },
                mutualGroups: new Set(),
                mutualInterests: new Set()
            });
        });
    }

    // Score and Format
    const suggestions: Suggestion[] = [];
    for (const [id, data] of potentialSuggestions.entries()) {
      const userInterests = new Set(data.user.interests || []);
      userInterests.forEach(interest => {
        if (currentUserInterests.has(interest)) {
            data.mutualInterests.add(interest);
        }
      });

      const mutualGroupCount = data.mutualGroups.size;
      const mutualInterestCount = data.mutualInterests.size;

      const jitter = Math.random() * 5;
      let score = (mutualGroupCount * 15) + (mutualInterestCount * 4) + jitter;
      let reason = "";

      if (mutualGroupCount > 0) {
          reason += `In ${mutualGroupCount} mutual group${mutualGroupCount > 1 ? 's' : ''}`;
      }
      if (mutualInterestCount > 0) {
          if (reason) reason += " and ";
          reason += `shares ${mutualInterestCount} interest${mutualInterestCount > 1 ? 's' : ''}`;
      }
      
      if (!reason) {
          reason = "Active community member";
          score = 1 + jitter;
      }

      suggestions.push({
        ...data.user,
        reason,
        score,
      });
    }
    
    return shuffleArray(suggestions)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

  } catch (error) {
    console.error('[SuggestionActions] Error getting friend suggestions:', error);
    return [];
  }
}
