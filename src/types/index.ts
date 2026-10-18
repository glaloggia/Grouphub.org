
// This file can be used for common type definitions across the application.

export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  createdAt?: string;
  updatedAt?: string;
  interests?: string[];
}

export interface ContactableUser {
  id: string; // Firebase UID
  name: string; // displayName
  avatar: string; // photoURL or a placeholder
  email?: string; // email
  createdAt?: string;
  updatedAt?: string;
  interests?: string[];
}

export interface AdminUserView {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  disabled: boolean;
  creationTime?: string;
  lastSignInTime?: string;
  groups?: { id: string; name: string; }[];
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  image?: string; // URL for the group's profile picture
  memberIds: string[];
  isPublic: boolean;
  creatorId: string;
  adminIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number; // e.g., 1 for every, 2 for every other
  daysOfWeek?: number[]; // Optional, for weekly; 0=Sun, 1=Mon, ..., 6=Sat. Assumed to be sorted if provided.
  dayOfMonth?: number; // Optional, for monthly
  endDate?: string; // Optional, YYYY-MM-DD
}

export interface Event {
  id: string; // For master events, this is the main ID. For instances, it's composite (e.g., masterId_date).
  name: string;
  description?: string;
  date: string; // For master: start date of recurrence. For instance: actual date of the instance.
  time?: string;
  duration?: number; // Duration in minutes
  location?: string;
  groupId: string;
  group?: string; // Group name, often denormalized
  image: string;
  attendees: string[]; // For non-recurring events OR instances. Master recurring events use instanceAttendees.
  isRecurring?: boolean; // True if this is a master recurring event definition.
  recurrence?: RecurrenceRule;
  masterEventId?: string; // If this is an instance, points to the ID of the master recurring event.
  isInstance?: boolean; // True if this event object represents a specific occurrence of a recurring event.
  instanceAttendees?: { [dateString: string]: string[] }; // For master recurring events, to store attendees per instance date.
  isCancelled?: boolean; // For non-recurring events OR master event. Instances get status from instanceMetadata.
  instanceMetadata?: { [dateString: string]: { isCancelled?: boolean } }; // For master recurring events, to store metadata per instance.
  creatorId: string; // ID of the user who created the event
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string; // Denormalized
  senderAvatar?: string; // Denormalized
  text: string;
  timestamp: string; // ISO String - for chronological order, effectively the creation time
  createdAt?: string;
  updatedAt?: string;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  timestamp: string; // ISO String
}


export interface Conversation {
  id:string; // For 1:1, can be a composite of sorted user IDs. For group, a unique ID.
  participantIds: string[];
  participantDetails: {
    [key: string]: {
      name: string;
      avatar: string;
    }
  };
  lastMessageText?: string;
  lastMessageTimestamp?: string; // ISO String - effectively the updatedAt
  lastMessageSenderId?: string; // ID of the user who sent the last message
  isGroupChat: boolean;
  unreadCount: number;
  name?: string; // For group chats
  avatar?: string; // For 1:1 chats, stores the *other* user's avatar. Not used for groups.
  createdAt?: string;
  updatedAt?: string;
}

export interface GroupJoinRequest {
  id: string; // Unique ID for the request itself
  groupId: string;
  userId: string;
  userName: string; // For display to admin
  userAvatar?: string; // For display to admin
  timestamp: string; // ISO string for when the request was made
  status: 'pending' | 'accepted' | 'declined'; // Added status
}

export interface FriendRequest {
  id: string; // Unique ID for the request
  fromUserId: string;
  fromUserName: string; // Denormalized for display
  fromUserAvatar?: string; // Denormalized
  toUserId: string;
  status: 'pending'; // Only pending requests are stored
  timestamp: string; // ISO string, effectively the createdAt
}

export interface Forum {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  threadCount: number;
  postCount: number;
  lastPost?: {
    threadId: string;
    threadTitle: string;
    postedAt: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ForumThread {
  id: string;
  forumId: string;
  title: string;
  authorId: string;
  authorName: string;
  postCount: number;
  viewCount: number;
  lastPost?: {
    postId: string;
    authorId: string;
    authorName: string;
    postedAt: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ForumPost {
  id: string;
  threadId: string;
  forumId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Report {
  id: string;
  entityId: string;
  entityType: 'group' | 'event' | 'user';
  entityLink: string;
  reporterId: string;
  reporterName?: string; // Denormalized for convenience
  reason: string;
  status: 'pending' | 'reviewed' | 'action_taken' | 'dismissed';
  timestamp: string; // ISO String
}
