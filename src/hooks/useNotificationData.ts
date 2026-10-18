
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { Conversation, FriendRequest, GroupJoinRequest, Group as StoredGroup, ForumThread } from '@/types';
import { S_getConversations, S_markConversationAsRead } from '@/actions/message-actions';
import { S_getGroupJoinRequests, getAllGroups } from '@/actions/group-actions';
import { S_getPendingFriendRequests } from '@/actions/friend-actions';
import { S_getParticipatedThreads } from '@/actions/forum-actions';

const GROUP_LAST_READ_PREFIX = "group_last_read_";
const THREAD_LAST_READ_PREFIX = "forum_thread_last_read_";

export interface NotificationData {
  unreadMessagesCount: number;
  pendingFriendRequestsCount: number;
  pendingGroupJoinRequestsCount: number;
  activeGroupsWithNewMessages: Array<{id: string, name: string}>;
  activeThreadsWithNewMessages: Array<{id: string, forumId: string, title: string}>;
  totalNotifications: number;
}

export function useNotificationData() {
  const { currentUser, loading: authLoading } = useAuth();
  const [notificationData, setNotificationData] = useState<NotificationData>({
    unreadMessagesCount: 0,
    pendingFriendRequestsCount: 0,
    pendingGroupJoinRequestsCount: 0,
    activeGroupsWithNewMessages: [],
    activeThreadsWithNewMessages: [],
    totalNotifications: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!currentUser) {
      setNotificationData({
        unreadMessagesCount: 0,
        pendingFriendRequestsCount: 0,
        pendingGroupJoinRequestsCount: 0,
        activeGroupsWithNewMessages: [],
        activeThreadsWithNewMessages: [],
        totalNotifications: 0,
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let unreadMessages = 0;
    let friendRequests = 0;
    let groupJoinReqsCount = 0;
    let groupsWithActivity: Array<{id: string, name: string}> = [];
    let threadsWithActivity: Array<{id: string, forumId: string, title: string}> = [];

    try {
      // 1. Fetch DMs
      const userConvos = await S_getConversations(currentUser.uid);
      unreadMessages = userConvos.reduce((sum, convo) => {
        if (convo.lastMessageSenderId !== currentUser.uid && convo.unreadCount > 0) {
          return sum + convo.unreadCount;
        }
        return sum;
      }, 0);
    } catch (e) { console.error("Error fetching unread messages for notifications:", e); }

    try {
      // 2. Fetch Friend Requests
      const pendingFriendReqs = await S_getPendingFriendRequests(currentUser.uid);
      friendRequests = pendingFriendReqs.length;
    } catch (e) { console.error("Error fetching friend requests for notifications:", e); }

    try {
      // 3. Fetch Group activity and Group Join Requests
      const allGroups = await getAllGroups(); 
      
      const memberGroups = allGroups.filter(g => g.memberIds.includes(currentUser.uid));
      const adminGroups = memberGroups.filter(g => g.adminIds.includes(currentUser.uid) || g.creatorId === currentUser.uid);

      // Check for new messages in member groups
      memberGroups.forEach(group => {
        const lastRead = localStorage.getItem(`${GROUP_LAST_READ_PREFIX}${group.id}`);
        const lastReadTime = lastRead ? new Date(lastRead).getTime() : 0;
        const groupUpdateTime = group.updatedAt ? new Date(group.updatedAt).getTime() : 0;

        if (groupUpdateTime > lastReadTime) {
          groupsWithActivity.push({ id: group.id, name: group.name });
        }
      });

      // Fetch pending join requests for admin groups
      let totalPendingGroupReqs = 0;
      for (const adminGroup of adminGroups) {
          const requestsForGroup = await S_getGroupJoinRequests(adminGroup.id, currentUser.uid);
          totalPendingGroupReqs += requestsForGroup.length;
      }
      groupJoinReqsCount = totalPendingGroupReqs;
    } catch (e) { console.error("Error fetching group activity for notifications:", e); }

    try {
      // 4. Fetch Forum Thread updates
      const participatedThreads = await S_getParticipatedThreads(currentUser.uid);
      participatedThreads.forEach(thread => {
          const lastRead = localStorage.getItem(`${THREAD_LAST_READ_PREFIX}${thread.id}`);
          const lastReadTime = lastRead ? new Date(lastRead).getTime() : 0;
          const threadUpdateTime = thread.updatedAt ? new Date(thread.updatedAt).getTime() : 0;

          if (threadUpdateTime > lastReadTime) {
              threadsWithActivity.push({ id: thread.id, forumId: thread.forumId, title: thread.title });
          }
      });
    } catch (e) { console.error("Error fetching forum activity for notifications:", e); }
    
    setNotificationData({
      unreadMessagesCount: unreadMessages,
      pendingFriendRequestsCount: friendRequests,
      pendingGroupJoinRequestsCount: groupJoinReqsCount,
      activeGroupsWithNewMessages: groupsWithActivity,
      activeThreadsWithNewMessages: threadsWithActivity,
      totalNotifications: unreadMessages + friendRequests + groupJoinReqsCount + groupsWithActivity.length + threadsWithActivity.length,
    });
    setIsLoading(false);
  }, [currentUser]);

  useEffect(() => {
    if (authLoading) {
        setIsLoading(true);
        return;
    }
    fetchNotifications();
    
    // Set up polling for new notifications every 30 seconds
    const intervalId = setInterval(() => {
        fetchNotifications();
    }, 30000);

    const handleStorageChange = () => {
        fetchNotifications();
    };
    window.addEventListener('storageUpdated', handleStorageChange);

    return () => {
        clearInterval(intervalId);
        window.removeEventListener('storageUpdated', handleStorageChange);
    };

  }, [currentUser, authLoading, fetchNotifications]); 

  const refreshNotifications = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const clearAllNotifications = useCallback(async () => {
    if (!currentUser) return;

    const now = new Date().toISOString();

    // Clear Group storage
    notificationData.activeGroupsWithNewMessages.forEach(g => {
        localStorage.setItem(`${GROUP_LAST_READ_PREFIX}${g.id}`, now);
    });

    // Clear Thread storage
    notificationData.activeThreadsWithNewMessages.forEach(t => {
        localStorage.setItem(`${THREAD_LAST_READ_PREFIX}${t.id}`, now);
    });

    // Mark all DMs as read
    try {
        const userConvos = await S_getConversations(currentUser.uid);
        const unreadConvos = userConvos.filter(c => c.lastMessageSenderId !== currentUser.uid && c.unreadCount > 0);
        await Promise.all(unreadConvos.map(c => S_markConversationAsRead(c.id, currentUser.uid)));
    } catch (e) {
        console.error("Error marking all conversations as read:", e);
    }

    // Refresh data
    dispatchStorageUpdatedEvent();
    fetchNotifications();
  }, [currentUser, notificationData, fetchNotifications]);


  return { notificationData, isLoading, refreshNotifications, clearAllNotifications };
}

export const dispatchStorageUpdatedEvent = () => {
  window.dispatchEvent(new CustomEvent('storageUpdated'));
};
