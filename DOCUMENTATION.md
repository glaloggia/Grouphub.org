

# GroupHub Application Documentation

## 1. Project Overview

GroupHub is a full-stack web application designed to help users create and manage communities (groups). It provides tools for scheduling events, facilitating communication through group-specific message boards and direct messaging, and fostering connections via a friend system. The platform also includes a discussion forums.

The application is built with a modern tech stack centered around Next.js and Firebase, providing a reactive user experience with a robust, serverless backend.

## 2. Core Features

### User Authentication
- **Email/Password & Google Sign-In**: Users can sign up and log in using their email and password or via their Google account.
- **Session Management**: Secure session management is handled by Firebase Authentication.
- **Profile Management**: Authenticated users can edit their profile, including their display name, bio, avatar image, and personal interests.
- **Account Deletion**: Users have the ability to permanently delete their own account and associated data.

### Groups
- **Group Creation & Management**: Users can create public or private groups, providing a name, description, and image.
- **Membership Control**: Public groups can be joined freely. Private groups require an admin's approval for join requests.
- **Admin Roles**: Group creators are automatically admins. They can promote other members to admin status, granting them rights to manage the group, its members, and its events.
- **Group Details Page**: Each group has a dedicated page with a message board, member list, and event schedule.

### Events
- **Event Creation**: Group admins can create events with details like name, description, date, time, location, and an image.
- **Recurring Events**: Events can be configured to recur daily, weekly, or monthly with specific rules.
- **RSVP System**: Group members can RSVP to events. Non-members can join a public group and RSVP in a single action.
- **Event Management**: Admins can edit, cancel, or delete events.

### Messaging
- **Direct Messaging (1:1)**: Users who are friends can start private, one-on-one conversations.
- **Group Message Boards**: Each group has its own message board, accessible only to members, for group-wide discussions.
- **Unread Indicators**: The application provides notifications and visual indicators for unread messages.

### Social & Friends System
- **Friend Requests**: Users can send, receive, accept, and decline friend requests.
- **Friends List**: Users can view their list of friends on their profile page.
- **Unfriending**: Users can remove friends from their list.
- **Friend Suggestions**: The application suggests potential friends to users based on mutual groups and shared interests.

### Forums
- **Discussion Forums**: A basic forum system is in place for structured community discussions (currently includes a forum list, but thread/post creation is not fully implemented on the frontend).

---

## 3. Data Models (Firestore Schemas)

The application's data is primarily stored in Google Cloud Firestore. The schemas are defined in `src/types/index.ts`.

- **`users` collection**: Stores public information for all users.
  - `id`, `name`, `email`, `avatar`, `friendIds`, `createdAt`, `updatedAt`, `bio`, `interests`.

- **`groups` collection**: Stores all group information.
  - `id`, `name`, `description`, `image`, `memberIds`, `adminIds`, `creatorId`, `isPublic`.
  - **Subcollection `messages`**: Contains `GroupMessage` documents for the group's message board.

- **`events` collection**: Stores all master event definitions.
  - `id`, `name`, `description`, `date`, `time`, `location`, `groupId`, `image`, `attendees` (for single events), `isRecurring`, `recurrence` (rule object), `instanceAttendees` (for recurring events).

- **`conversations` collection**: Stores metadata for direct message chats.
  - `id` (composite key of user IDs), `participantIds`, `lastMessageText`, `lastMessageTimestamp`.
  - **Subcollection `messages`**: Contains `ChatMessage` documents for the conversation.

- **`friendRequests` collection**: Stores pending friend requests.
  - `id`, `fromUserId`, `toUserId`, `timestamp`.

- **`groupJoinRequests` collection**: Stores pending requests to join private groups.
  - `id`, `groupId`, `userId`, `userName`, `timestamp`.

- **`forums` collection**: Stores forum categories.
  - `id`, `name`, `description`, `threadCount`, `postCount`.

---

## 4. Technology Stack

- **Framework**: Next.js (with App Router)
- **Language**: TypeScript
- **UI Components**: ShadCN UI
- **Styling**: Tailwind CSS
- **Authentication**: Firebase Authentication
- **Database**: Google Cloud Firestore (via Firebase Admin SDK)
- **File Storage**: Google Cloud Storage (for avatars and images)
- **Analytics**: Firebase Analytics
- **State Management**: React Context API (for Auth and Theme)
- **Deployment**: Firebase App Hosting

---

## 5. Key File Structure

- **`src/app/(app)`**: Main authenticated application routes (dashboard, groups, events, etc.).
- **`src/app/(auth)`**: Authentication routes (login, signup).
- **`src/app/api`**: API routes, though most data operations are handled by Server Actions.
- **`src/actions`**: Server-side functions (Server Actions) that interact with the Firebase Admin SDK to perform database operations securely.
- **`src/components`**: Reusable React components.
  - `layout`: Components for the main application layout (Header, Sidebar).
  - `shared`: Components used across multiple features.
  - `ui`: Core UI elements from ShadCN.
- **`src/context`**: React context providers for managing global state like authentication and theme.
- **`src/hooks`**: Custom React hooks for shared logic (e.g., `useMobile`, `useNotificationData`).
- **`src/lib`**: Utility functions and Firebase configuration.
  - `firebase.ts`: Client-side Firebase initialization.
  - `firebase-admin.ts`: Server-side Firebase Admin SDK initialization.
- **`src/types`**: TypeScript type and interface definitions for all data models.
